import { makeAutoObservable, remove } from 'mobx';
import { fabric } from 'fabric';
import { getUid, isHtmlAudioElement, isHtmlImageElement, isHtmlVideoElement } from '@/utils';
import anime, { get } from 'animejs';
import { MenuOption, EditorElement, Animation, TimeFrame, VideoEditorElement, AudioEditorElement, Placement, ImageEditorElement, Effect, TextEditorElement } from '../types';
import { FabricUitls } from '@/utils/fabric-utils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { getFirestore, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { getFilesFromFolder } from "@/utils/fileUpload";
import { User } from 'firebase/auth';
import { deepCopy, removeUndefinedFields, mergeElementUpdate, mergeElementDelete,
  addElementToFirestore, addAnimationToFirestore, uploadElementToFirebase,
  addFileUrlsToFirestore, addBackgroundToFirestore, addTimesToFirestore, uploadAnimationToFirebase} from '@/utils/utils';
import { diff } from 'deep-object-diff';
import { uploadFile } from "@/utils/fileUpload";
import { getUserBgColor } from '@/utils/userColors';
import { getTailwindColorValue } from '@/utils/colorUtils';

export class Store {
  canvas: fabric.Canvas | null

  backgroundColor: string;

  selectedMenuOption: MenuOption;
  audios: string[]
  videos: string[]
  images: string[]
  editorElements: EditorElement[]
  selectedElement: EditorElement | null;
  order: number;
  pendingMerge: { [key: string]: {
    from: EditorElement,
    to: EditorElement,
    type: 'deleted' | 'updated'
  } };
  conflit: { [key: string]: EditorElement};
  // pendingMerge: EditorElement | null;
  unsubscribe: () => void;

  // Project ID to separate different projects
  projectId: string | null;
  user: User | null;
  onlineUsers: Array<{uid: string; [key: string]: any}>;

  maxTime: number
  animations: Animation[]
  animationTimeLine: anime.AnimeTimelineInstance;
  playing: boolean;

  currentKeyFrame: number;
  fps: number;

  possibleVideoFormats: string[] = ['mp4', 'webm'];
  selectedVideoFormat: 'mp4' | 'webm';

  constructor(user: User | null) {
    this.canvas = null;
    this.videos = [];
    this.images = [];
    this.audios = [];
    this.editorElements = [];
    this.backgroundColor = '#111111';
    this.maxTime = 30 * 1000;
    this.playing = false;
    this.currentKeyFrame = 0;
    this.selectedElement = null;
    this.fps = 60;
    this.animations = [];
    this.animationTimeLine = anime.timeline();
    this.selectedMenuOption = 'Video';
    this.selectedVideoFormat = 'mp4';
    this.order = 0;
    this.pendingMerge = {};
    this.conflit = {};
    this.unsubscribe = () => { };
    this.projectId = null;
    this.user = user;
    this.onlineUsers = [];
    makeAutoObservable(this);
  }

  // set project ID
  setProjectId(projectId: string) {
    this.projectId = projectId;
  }

  setOnlineUsers(onlineUsers: any[]) {
    this.onlineUsers = onlineUsers;
    // Refresh elements to update colors based on online users
    this.refreshElements();
  }

  get currentTimeInMs() {
    return this.currentKeyFrame * 1000 / this.fps;
  }

  setCurrentTimeInMs(time: number) {
    this.currentKeyFrame = Math.floor(time / 1000 * this.fps);
  }

  setSelectedMenuOption(selectedMenuOption: MenuOption) {
    this.selectedMenuOption = selectedMenuOption;
  }

  setCanvas(canvas: fabric.Canvas | null) {
    this.canvas = canvas;
    if (canvas) {
      canvas.backgroundColor = this.backgroundColor;
    }
  }

  setBackgroundColor(backgroundColor: string, localChange:boolean = true) {
    this.backgroundColor = backgroundColor;
    if (this.canvas) {
      this.canvas.backgroundColor = backgroundColor;
    }
    if(localChange){
      addBackgroundToFirestore(backgroundColor, this.projectId);
    }
  }

  updateEffect(id: string, effect: Effect) {
    const index = this.editorElements.findIndex((element) => element.id === id);
    const element = this.editorElements[index];
    if (isEditorVideoElement(element) || isEditorImageElement(element)) {
      element.properties.effect = effect;
    }
    this.refreshElements();
  }

  setVideos(videos: string[]) {
    this.videos = videos;
  }

  async addVideoResourceFile(file: File) {
    const fileURL = await uploadFile(file, `projects/${this.projectId}/videos`);
    this.addVideoResource(fileURL);
  }
  async addAudioResourceFile(file: File) {
    const fileURL = await uploadFile(file, `projects/${this.projectId}/audios`);
    this.addAudioResource(fileURL);
  }
  async addImageResourceFile(file: File) {
    const fileURL = await uploadFile(file, `projects/${this.projectId}/images`);
    this.addImageResource(fileURL);
  }

  addVideoResource(video: string, localChange: boolean = true) {
    if (this.videos.includes(video)) {
      return;
    }
    this.videos = [...this.videos, video];
    if(localChange){
      addFileUrlsToFirestore(video, this.projectId!, 'videos');
    }
  }
  addAudioResource(audio: string, localChange: boolean = true) {
    if (this.audios.includes(audio)) {
      return;
    }
    this.audios = [...this.audios, audio];
    if(localChange){
      addFileUrlsToFirestore(audio, this.projectId!, 'audios');
    }
  }
  addImageResource(image: string, localChange: boolean = true) {
    if (this.images.includes(image)) {
      return;
    }
    this.images = [...this.images, image];
    if(localChange){
      addFileUrlsToFirestore(image, this.projectId!, 'images');
    }
  }

  async addAnimation(animation: Animation, localChange: boolean = true) {
    if(!localChange){
      const ele = this.animations.find((e) => e.id === animation.id);
      if(ele){
        return;
      }
    }

    addAnimationToFirestore(animation, this.projectId);
    this.animations = [...this.animations, animation];
    this.refreshAnimations();
  }
  updateAnimation(id: string, animation: Animation, localChange: boolean = true) {
    if(!localChange){
      const ele = this.animations.find((e) => e.id === animation.id);
      if (!ele) {
        return;
      }

      const dif = diff(ele, animation);
      if (Object.keys(dif).length === 0) {
        return;
      }
    }

    uploadAnimationToFirebase(animation, this.projectId);
    const index = this.animations.findIndex((a) => a.id === id);
    this.animations[index] = animation;
    this.refreshAnimations();
  }

  refreshAnimations() {
    anime.remove(this.animationTimeLine);
    this.animationTimeLine = anime.timeline({
      duration: this.maxTime,
      autoplay: false,
    });
    for (let i = 0; i < this.animations.length; i++) {
      const animation = this.animations[i];
      const editorElement = this.editorElements.find((element) => element.id === animation.targetId);
      const fabricObject = editorElement?.fabricObject;
      if (!editorElement || !fabricObject) {
        continue;
      }
      fabricObject.clipPath = undefined;
      switch (animation.type) {
        case "fadeIn": {
          this.animationTimeLine.add({
            opacity: [0, 1],
            duration: animation.duration,
            targets: fabricObject,
            easing: 'linear',
          }, editorElement.timeFrame.start);
          break;
        }
        case "fadeOut": {
          this.animationTimeLine.add({
            opacity: [1, 0],
            duration: animation.duration,
            targets: fabricObject,
            easing: 'linear',
          }, editorElement.timeFrame.end - animation.duration);
          break
        }
        case "slideIn": {
          const direction = animation.properties.direction;
          const targetPosition = {
            left: editorElement.placement.x,
            top: editorElement.placement.y,
          }
          const startPosition = {
            left: (direction === "left" ? - editorElement.placement.width : direction === "right" ? this.canvas?.width : editorElement.placement.x),
            top: (direction === "top" ? - editorElement.placement.height : direction === "bottom" ? this.canvas?.height : editorElement.placement.y),
          }
          if (animation.properties.useClipPath) {
            const clipRectangle = FabricUitls.getClipMaskRect(editorElement, 50);
            fabricObject.set('clipPath', clipRectangle)
          }
          if (editorElement.type === "text" && animation.properties.textType === "character") {
            this.canvas?.remove(...editorElement.properties.splittedTexts)
            // @ts-ignore
            editorElement.properties.splittedTexts = getTextObjectsPartitionedByCharacters(editorElement.fabricObject, editorElement);
            editorElement.properties.splittedTexts.forEach((textObject) => {
              this.canvas!.add(textObject);
            })
            const duration = animation.duration / 2;
            const delay = duration / editorElement.properties.splittedTexts.length;
            for (let i = 0; i < editorElement.properties.splittedTexts.length; i++) {
              const splittedText = editorElement.properties.splittedTexts[i];
              const offset = {
                left: splittedText.left! - editorElement.placement.x,
                top: splittedText.top! - editorElement.placement.y
              }
              this.animationTimeLine.add({
                left: [startPosition.left! + offset.left, targetPosition.left + offset.left],
                top: [startPosition.top! + offset.top, targetPosition.top + offset.top],
                delay: i * delay,
                duration: duration,
                targets: splittedText,
              }, editorElement.timeFrame.start);
            }
            this.animationTimeLine.add({
              opacity: [1, 0],
              duration: 1,
              targets: fabricObject,
              easing: 'linear',
            }, editorElement.timeFrame.start);
            this.animationTimeLine.add({
              opacity: [0, 1],
              duration: 1,
              targets: fabricObject,
              easing: 'linear',
            }, editorElement.timeFrame.start + animation.duration);

            this.animationTimeLine.add({
              opacity: [0, 1],
              duration: 1,
              targets: editorElement.properties.splittedTexts,
              easing: 'linear',
            }, editorElement.timeFrame.start);
            this.animationTimeLine.add({
              opacity: [1, 0],
              duration: 1,
              targets: editorElement.properties.splittedTexts,
              easing: 'linear',
            }, editorElement.timeFrame.start + animation.duration);
          }
          this.animationTimeLine.add({
            left: [startPosition.left, targetPosition.left],
            top: [startPosition.top, targetPosition.top],
            duration: animation.duration,
            targets: fabricObject,
            easing: 'linear',
          }, editorElement.timeFrame.start);
          break
        }
        case "slideOut": {
          const direction = animation.properties.direction;
          const startPosition = {
            left: editorElement.placement.x,
            top: editorElement.placement.y,
          }
          const targetPosition = {
            left: (direction === "left" ? - editorElement.placement.width : direction === "right" ? this.canvas?.width : editorElement.placement.x),
            top: (direction === "top" ? -100 - editorElement.placement.height : direction === "bottom" ? this.canvas?.height : editorElement.placement.y),
          }
          if (animation.properties.useClipPath) {
            const clipRectangle = FabricUitls.getClipMaskRect(editorElement, 50);
            fabricObject.set('clipPath', clipRectangle)
          }
          this.animationTimeLine.add({
            left: [startPosition.left, targetPosition.left],
            top: [startPosition.top, targetPosition.top],
            duration: animation.duration,
            targets: fabricObject,
            easing: 'linear',
          }, editorElement.timeFrame.end - animation.duration);
          break
        }
        case "breathe": {
          const itsSlideInAnimation = this.animations.find((a) => a.targetId === animation.targetId && (a.type === "slideIn"));
          const itsSlideOutAnimation = this.animations.find((a) => a.targetId === animation.targetId && (a.type === "slideOut"));
          const timeEndOfSlideIn = itsSlideInAnimation ? editorElement.timeFrame.start + itsSlideInAnimation.duration : editorElement.timeFrame.start;
          const timeStartOfSlideOut = itsSlideOutAnimation ? editorElement.timeFrame.end - itsSlideOutAnimation.duration : editorElement.timeFrame.end;
          if (timeEndOfSlideIn > timeStartOfSlideOut) {
            continue;
          }
          const duration = timeStartOfSlideOut - timeEndOfSlideIn;
          const easeFactor = 4;
          const suitableTimeForHeartbeat = 1000 * 60 / 72 * easeFactor
          const upScale = 1.05;
          const currentScaleX = fabricObject.scaleX ?? 1;
          const currentScaleY = fabricObject.scaleY ?? 1;
          const finalScaleX = currentScaleX * upScale;
          const finalScaleY = currentScaleY * upScale;
          const totalHeartbeats = Math.floor(duration / suitableTimeForHeartbeat);
          if (totalHeartbeats < 1) {
            continue;
          }
          const keyframes = [];
          for (let i = 0; i < totalHeartbeats; i++) {
            keyframes.push({ scaleX: finalScaleX, scaleY: finalScaleY });
            keyframes.push({ scaleX: currentScaleX, scaleY: currentScaleY });
          }

          this.animationTimeLine.add({
            duration: duration,
            targets: fabricObject,
            keyframes,
            easing: 'linear',
            loop: true
          }, timeEndOfSlideIn);

          break
        }
      }
    }
  }

  async removeAnimation(id: string) {
    if (!this.projectId) {
      console.error("Project ID is null. Cannot upload animation to Firebase.");
      return;
    }

    if(id === undefined){
      alert("Element ID is undefined");
      return;
    }

    const ele = this.animations.find((e) => e.id === id);
    if(!ele || !ele.uid){
      return;
    }

    const db = getFirestore();
    const docRef = doc(db, `projects/${this.projectId}/animations`, ele.uid);
    try {
      await deleteDoc(docRef);

      this.animations = this.animations.filter(
          (animation) => animation.id !== id
      );
      this.refreshAnimations();
    } catch (error) {
      console.error("Error deleting document from Firebase:", error);
      return;
    }
  }

  setSelectedElement(selectedElement: EditorElement | null) {
    var refresh = false;
    if (this.canvas) {
      if (selectedElement?.fabricObject){
        this.canvas.setActiveObject(selectedElement.fabricObject);
      }
      else{
        if(this.selectedElement != null){
          const element = this.mergeElement(
            this.pendingMerge[this.selectedElement.id]?.from,
            this.selectedElement,
            this.pendingMerge[this.selectedElement.id]?.to,
            this.pendingMerge[this.selectedElement.id]?.type
          );
          if(element){
            if(this.pendingMerge[this.selectedElement.id]){
              delete this.pendingMerge[this.selectedElement.id];
              this.updateEditorElement(element);
            }
          }else{
            const ele = removeUndefinedFields(deepCopy(this.selectedElement));
            ele.conflitId = this.selectedElement.id;
            ele.id = getUid();
            ele.name = `${this.selectedElement.name} (conflit)`;
            this.conflit[ele.id] = ele;
            selectedElement = this.pendingMerge[this.selectedElement.id]?.to;
            refresh = true;

            alert("There is a conflict with the element. Pls, review the conflict track and delete one of them to sryncronize all data.")
          }
        }
        this.canvas.discardActiveObject();
      }
    }
    this.selectedElement = selectedElement;
    return refresh;
  }
  updateSelectedElement() {
    this.selectedElement = this.editorElements.find((element) => element.id === this.selectedElement?.id) ?? null;
  }

  mergeElement(original: EditorElement, from: EditorElement, to: EditorElement, type: 'deleted' | 'updated') {
    if(original === undefined || to === undefined) {
      return from;
    }

    if(type == 'updated'){
      return mergeElementUpdate(original, from, to);
    }else{
      return mergeElementDelete(original, from, to, this.projectId);
    }
  }

  setEditorElements(editorElements: EditorElement[]) {
    this.editorElements = editorElements;
    this.updateSelectedElement();
    this.refreshElements();
    // this.refreshAnimations();
  }

  updateEditorElement(editorElement: EditorElement, localChange: boolean = true) {
    if(this.conflit[editorElement.id] != undefined){
      this.conflit[editorElement.id] = editorElement;
      return;
    }

    if(this.pendingMerge[editorElement.id] == undefined) {
      if(!localChange){
        const ele = this.editorElements.find((e) => e.id === editorElement.id);
        if (!ele) {
          return;
        }
        const dif = diff(ele, editorElement);
        if ('fabricObject' in dif) {
          delete dif.fabricObject;
        }

        if (Object.keys(dif).length === 0) {
          return;
        }
      }else{
        uploadElementToFirebase(editorElement, this.projectId);
      }
    }
    this.setEditorElements(this.editorElements.map((element) =>
      element.id === editorElement.id ? editorElement : element
    ));
  }

  updateEditorElementTimeFrame(editorElement: EditorElement, timeFrame: Partial<TimeFrame>) {
    if (timeFrame.start != undefined && timeFrame.start < 0) {
      timeFrame.start = 0;
    }
    if (timeFrame.end != undefined && timeFrame.end > this.maxTime) {
      timeFrame.end = this.maxTime;
    }
    const newEditorElement = {
      ...editorElement,
      timeFrame: {
        ...editorElement.timeFrame,
        ...timeFrame,
      }
    }
    this.updateVideoElements();
    this.updateAudioElements();
    this.updateEditorElement(newEditorElement);
    this.refreshAnimations();
  }

  async addEditorElement(editorElement: EditorElement, localChange: boolean = true) {
    if(!localChange){
      const ele = this.editorElements.find((e) => e.id === editorElement.id);
      if(ele){
        return;
      }
      this.setEditorElements([...this.editorElements, editorElement]);
    }else {
      this.setEditorElements([...this.editorElements, editorElement]);
      await addElementToFirestore(editorElement, this.projectId);
      const ele = this.editorElements.find((e) => e.id === editorElement.id);
      ele!.uid = editorElement.uid;
    }

    this.setSelectedElement(this.editorElements[this.editorElements.length - 1]);
    // this.refreshElements();
  }

  async removeEditorElement(id: string | undefined) {
    if (id === undefined) {
      alert("Element ID is undefined");
      return;
    }

    if (this.conflit[id] != undefined) {
      delete this.conflit[id];
      return;
    }

    const elementToRemove = this.editorElements.find(
      (editorElement) => editorElement.id === id
    );

    if (!elementToRemove || !elementToRemove.uid) {
      return;
    }

    if (!this.projectId) {
      console.error("Project ID is null. Cannot remove element from Firestore.");
      return;
    }

    var hasConflict = false;
    for(const [key, value] of Object.entries(this.conflit)){
      if(value.conflitId == id){
        value.id = elementToRemove.id;
        value.name = elementToRemove.name;
        value.conflitId = null;
        this.updateEditorElement(value);

        hasConflict = true;
        delete this.conflit[key];
        break;
      }
    }
    if(hasConflict){
      return;
    }

    const db = getFirestore();
    const docRef = doc(db, `projects/${this.projectId}/videoEditor`, elementToRemove.uid);
    try {
      await deleteDoc(docRef);

      this.setEditorElements(
        this.editorElements.filter(
          (editorElement) => editorElement.id !== id
        )
      );
      this.refreshElements();
    } catch (error) {
      console.error("Error deleting document from Firebase:", error);
      return;
    }
  }

  setMaxTime(maxTime: number, localChange: boolean = true) {
    this.maxTime = maxTime;

    if(localChange){
      addTimesToFirestore(maxTime, this.projectId);
    }
  }

  setPlaying(playing: boolean) {
    this.playing = playing;
    this.updateVideoElements();
    this.updateAudioElements();
    if (playing) {
      this.startedTime = Date.now();
      this.startedTimePlay = this.currentTimeInMs
      requestAnimationFrame(() => {
        this.playFrames();
      });
    }
  }

  startedTime = 0;
  startedTimePlay = 0;

  playFrames() {
    if (!this.playing) {
      return;
    }
    const elapsedTime = Date.now() - this.startedTime;
    const newTime = this.startedTimePlay + elapsedTime;
    this.updateTimeTo(newTime);
    if (newTime > this.maxTime) {
      this.currentKeyFrame = 0;
      this.setPlaying(false);
    } else {
      requestAnimationFrame(() => {
        this.playFrames();
      });
    }
  }

  updateTimeTo(newTime: number) {
    this.setCurrentTimeInMs(newTime);
    this.animationTimeLine.seek(newTime);
    if (this.canvas) {
      this.canvas.backgroundColor = this.backgroundColor;
    }
    this.editorElements.forEach(
      e => {
        if (!e.fabricObject) return;
        const isInside = e.timeFrame.start <= newTime && newTime <= e.timeFrame.end;
        e.fabricObject.visible = isInside;
      }
    )
  }

  handleSeek(seek: number) {
    if (this.playing) {
      this.setPlaying(false);
    }
    this.updateTimeTo(seek);
    this.updateVideoElements();
    this.updateAudioElements();
  }

  addVideo(index: number) {
    const videoElement = document.getElementById(`video-${index}`)
    if (!isHtmlVideoElement(videoElement)) {
      return;
    }
    const videoDurationMs = videoElement.duration * 1000;
    const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    const id = getUid();
    this.addEditorElement(
      {
        id,
        uid: null,
        conflitId: null,
        name: `Media(video) ${index + 1}`,
        type: "video",
        order: this.editorElements.length,
        placement: {
          x: 0,
          y: 0,
          width: 100 * aspectRatio,
          height: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
        timeFrame: {
          start: 0,
          end: videoDurationMs,
        },
        properties: {
          elementId: `video-${id}`,
          src: videoElement.src,
          effect: {
            type: "none",
          }
        },
      },
    );
  }

  addImage(index: number) {
    const imageElement = document.getElementById(`image-${index}`)
    if (!isHtmlImageElement(imageElement)) {
      return;
    }
    const aspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
    const id = getUid();
    this.addEditorElement({
      id,
      uid: null,
      conflitId: null,
      name: `Media(image) ${index + 1}`,
      type: "image",
      order: this.editorElements.length,
      placement: {
        x: 0,
        y: 0,
        width: 100 * aspectRatio,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      timeFrame: {
        start: 0,
        end: this.maxTime,
      },
      properties: {
        elementId: `image-${id}`,
        src: imageElement.src,
        effect: {
          type: "none",
        }
      },
    });
  }

  addAudio(index: number) {
    const audioElement = document.getElementById(`audio-${index}`)
    if (!isHtmlAudioElement(audioElement)) {
      return;
    }
    const audioDurationMs = audioElement.duration * 1000;
    const id = getUid();
    this.addEditorElement(
      {
        id,
        uid: null,
        conflitId: null,
        name: `Media(audio) ${index + 1}`,
        type: "audio",
        order: this.editorElements.length,
        placement: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
        timeFrame: {
          start: 0,
          end: audioDurationMs,
        },
        properties: {
          elementId: `audio-${id}`,
          src: audioElement.src,
        },
      },
    );

  }

  addText(options: {
    text: string,
    fontSize: number,
    fontWeight: number,
  }) {
    const id = getUid();
    const index = this.editorElements.length;
    this.addEditorElement(
      {
        id,
        uid: null,
        conflitId: null,
        name: `Text ${index + 1}`,
        type: "text",
        order: this.editorElements.length,
        placement: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
        timeFrame: {
          start: 0,
          end: this.maxTime,
        },
        properties: {
          text: options.text,
          fontSize: options.fontSize,
          fontWeight: options.fontWeight,
          splittedTexts: [],
        },
      },
    );
  }

  updateVideoElements() {
    this.editorElements.filter(
      (element): element is VideoEditorElement =>
        element.type === "video"
    )
      .forEach((element) => {
        const video = document.getElementById(element.properties.elementId);
        if (isHtmlVideoElement(video)) {
          const videoTime = (this.currentTimeInMs - element.timeFrame.start) / 1000;
          video.currentTime = videoTime;
          if (this.playing) {
            video.play();
          } else {
            video.pause();
          }
        }
      })
  }

  updateAudioElements() {
    this.editorElements.filter(
      (element): element is AudioEditorElement =>
        element.type === "audio"
    )
      .forEach((element) => {
        const audio = document.getElementById(element.properties.elementId);
        if (isHtmlAudioElement(audio)) {
          const audioTime = (this.currentTimeInMs - element.timeFrame.start) / 1000;
          audio.currentTime = audioTime;
          if (this.playing) {
            audio.play();
          } else {
            audio.pause();
          }
        }
      })
  }
  // saveCanvasToVideo() {
  //   const video = document.createElement("video");
  //   const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  //   const stream = canvas.captureStream();
  //   video.srcObject = stream;
  //   video.play();
  //   const mediaRecorder = new MediaRecorder(stream);
  //   const chunks: Blob[] = [];
  //   mediaRecorder.ondataavailable = function (e) {
  //     console.log("data available");
  //     console.log(e.data);
  //     chunks.push(e.data);
  //   };
  //   mediaRecorder.onstop = function (e) {
  //     const blob = new Blob(chunks, { type: "video/webm" });
  //     const url = URL.createObjectURL(blob);
  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = "video.webm";
  //     a.click();
  //   };
  //   mediaRecorder.start();
  //   setTimeout(() => {
  //     mediaRecorder.stop();
  //   }, this.maxTime);

  // }

  setVideoFormat(format: 'mp4' | 'webm') {
    this.selectedVideoFormat = format;
  }

  saveCanvasToVideoWithAudio() {
    this.saveCanvasToVideoWithAudioWebmMp4();
  }

  saveCanvasToVideoWithAudioWebmMp4() {
    console.log('modified')
    let mp4 = this.selectedVideoFormat === 'mp4'
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const stream = canvas.captureStream(30);
    const audioElements = this.editorElements.filter(isEditorAudioElement)
    const audioStreams: MediaStream[] = [];
    audioElements.forEach((audio) => {
      const audioElement = document.getElementById(audio.properties.elementId) as HTMLAudioElement;
      let ctx = new AudioContext();
      let sourceNode = ctx.createMediaElementSource(audioElement);
      let dest = ctx.createMediaStreamDestination();
      sourceNode.connect(dest);
      sourceNode.connect(ctx.destination);
      audioStreams.push(dest.stream);
    });
    audioStreams.forEach((audioStream) => {
      stream.addTrack(audioStream.getAudioTracks()[0]);
    });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.height = 500;
    video.width = 800;
    // video.controls = true;
    // document.body.appendChild(video);
    video.play().then(() => {
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = function (e) {
        chunks.push(e.data);
        console.log("data available");

      };
      mediaRecorder.onstop = async function (e) {
        const blob = new Blob(chunks, { type: "video/webm" });

        if (mp4) {
          // lets use ffmpeg to convert webm to mp4
          const data = new Uint8Array(await (blob).arrayBuffer());
          const ffmpeg = new FFmpeg();
          const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd"
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            // workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
          });
          await ffmpeg.writeFile('video.webm', data);
          await ffmpeg.exec(["-y", "-i", "video.webm", "-c", "copy", "video.mp4"]);
          // await ffmpeg.exec(["-y", "-i", "video.webm", "-c:v", "libx264", "video.mp4"]);

          const output = await ffmpeg.readFile('video.mp4');
          const outputBlob = new Blob([output], { type: "video/mp4" });
          const outputUrl = URL.createObjectURL(outputBlob);
          const a = document.createElement("a");
          a.download = "video.mp4";
          a.href = outputUrl;
          a.click();

        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "video.webm";
          a.click();
        }
      };
      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
      }, this.maxTime);
      video.remove();
    })
  }

  refreshElements() {
    var refresh = false;
    const store = this;
    if (!store.canvas) return;
    const canvas = store.canvas;
    store.canvas.remove(...store.canvas.getObjects());

    var allElements = [...store.editorElements, ...Object.values(store.conflit)];
    allElements = allElements.sort((a, b) => a.order - b.order);


    for (let index = 0; index < allElements.length; index++) {
      const element = allElements[index];

      switch (element.type) {
        case "video": {
          console.log("elementid", element.properties.elementId);
          if (document.getElementById(element.properties.elementId) == null)
            continue;
          const videoElement = document.getElementById(
            element.properties.elementId
          );
          if (!isHtmlVideoElement(videoElement)) continue;
          // const filters = [];
          // if (element.properties.effect?.type === "blackAndWhite") {
          //   filters.push(new fabric.Image.filters.Grayscale());
          // }
          // No background rectangle needed in canvas

          const videoObject = new fabric.CoverVideo(videoElement, {
            name: element.id,
            left: element.placement.x,
            top: element.placement.y,
            width: element.placement.width,
            height: element.placement.height,
            scaleX: element.placement.scaleX,
            scaleY: element.placement.scaleY,
            angle: element.placement.rotation,
            objectCaching: false,
            selectable: true,
            lockUniScaling: true,
            // filters: filters,
            // @ts-ignore
            customFilter: element.properties.effect.type,
          });

          element.fabricObject = videoObject;
          element.properties.imageObject = videoObject;
          videoElement.width = 100;
          videoElement.height =
            (videoElement.videoHeight * 100) / videoElement.videoWidth;
          canvas.add(videoObject);
          canvas.on("object:modified", function (e) {
            if (!e.target) return;
            const target = e.target;
            if (target != videoObject) return;
            const placement = element.placement;
            const newPlacement: Placement = {
              ...placement,
              x: target.left ?? placement.x,
              y: target.top ?? placement.y,
              rotation: target.angle ?? placement.rotation,
              width:
                target.width && target.scaleX
                  ? target.width * target.scaleX
                  : placement.width,
              height:
                target.height && target.scaleY
                  ? target.height * target.scaleY
                  : placement.height,
              scaleX: 1,
              scaleY: 1,
            };
            // No background rectangle to update

            const newElement = {
              ...element,
              placement: newPlacement,
            };
            store.updateEditorElement(newElement);
          });
          break;
        }
        case "image": {
          if (document.getElementById(element.properties.elementId) == null)
            continue;
          const imageElement = document.getElementById(
            element.properties.elementId
          );
          if (!isHtmlImageElement(imageElement)) continue;
          // const filters = [];
          // if (element.properties.effect?.type === "blackAndWhite") {
          //   filters.push(new fabric.Image.filters.Grayscale());
          // }
          // No background rectangle needed in canvas

          const imageObject = new fabric.CoverImage(imageElement, {
            name: element.id,
            left: element.placement.x,
            top: element.placement.y,
            angle: element.placement.rotation,
            objectCaching: false,
            selectable: true,
            lockUniScaling: true,
            // filters
            // @ts-ignore
            customFilter: element.properties.effect.type,
          });
          // imageObject.applyFilters();
          element.fabricObject = imageObject;
          element.properties.imageObject = imageObject;
          const image = {
            w: imageElement.naturalWidth,
            h: imageElement.naturalHeight,
          };

          imageObject.width = image.w;
          imageObject.height = image.h;
          imageElement.width = image.w;
          imageElement.height = image.h;
          imageObject.scaleToHeight(image.w);
          imageObject.scaleToWidth(image.h);
          const toScale = {
            x: element.placement.width / image.w,
            y: element.placement.height / image.h,
          };
          imageObject.scaleX = toScale.x * element.placement.scaleX;
          imageObject.scaleY = toScale.y * element.placement.scaleY;
          canvas.add(imageObject);
          canvas.on("object:modified", function (e) {
            if (!e.target) return;
            const target = e.target;
            if (target != imageObject) return;
            const placement = element.placement;
            let fianlScale = 1;
            if (target.scaleX && target.scaleX > 0) {
              fianlScale = target.scaleX / toScale.x;
            }
            const newPlacement: Placement = {
              ...placement,
              x: target.left ?? placement.x,
              y: target.top ?? placement.y,
              rotation: target.angle ?? placement.rotation,
              scaleX: fianlScale,
              scaleY: fianlScale,
            };
            // No background rectangle to update

            const newElement = {
              ...element,
              placement: newPlacement,
            };
            store.updateEditorElement(newElement);
          });
          break;
        }
        case "audio": {
          break;
        }
        case "text": {
          // No background rectangle needed in canvas

          const textObject = new fabric.Textbox(element.properties.text, {
            name: element.id,
            left: element.placement.x,
            top: element.placement.y,
            scaleX: element.placement.scaleX,
            scaleY: element.placement.scaleY,
            width: element.placement.width,
            height: element.placement.height,
            angle: element.placement.rotation,
            fontSize: element.properties.fontSize,
            fontWeight: element.properties.fontWeight,
            objectCaching: false,
            selectable: true,
            lockUniScaling: true,
            fill: "#ffffff",
          });
          element.fabricObject = textObject;
          canvas.add(textObject);
          canvas.on("object:modified", function (e) {
            if (!e.target) return;
            const target = e.target;
            if (target != textObject) return;
            const placement = element.placement;
            const newPlacement: Placement = {
              ...placement,
              x: target.left ?? placement.x,
              y: target.top ?? placement.y,
              rotation: target.angle ?? placement.rotation,
              width: target.width ?? placement.width,
              height: target.height ?? placement.height,
              scaleX: target.scaleX ?? placement.scaleX,
              scaleY: target.scaleY ?? placement.scaleY,
            };

            // No background rectangle to update

            const newElement = {
              ...element,
              placement: newPlacement,
              properties: {
                ...element.properties,
                // @ts-ignore
                text: target?.text,
              },
            };
            store.updateEditorElement(newElement);
          });
          break;
        }
        default: {
          throw new Error("Not implemented");
        }
      }
      if (element.fabricObject) {
        element.fabricObject.on("selected", function (e) {
          if(store.setSelectedElement(element)){
            refresh = true;
            return;
          }
        });
      }
      if(refresh){
        break;
      }
    }

    if(refresh){
      this.refreshElements();
      return;
    }
    const selectedEditorElement = store.selectedElement;
    if (selectedEditorElement && selectedEditorElement.fabricObject) {
      canvas.setActiveObject(selectedEditorElement.fabricObject);
    }
    this.refreshAnimations();
    this.updateTimeTo(this.currentTimeInMs);
    store.canvas.renderAll();
  }

  async sync() {
    if (!this.projectId) {
      console.error("Project ID is null. Cannot sync data.");
      return;
    }

    // getFilesFromFolder(`projects/${this.projectId}/videoEditor/images`)
    //   .then((urls) => {
    //     urls.forEach((url) => {
    //       this.images.push(url);
    //     });
    //   })
    //   .catch((error) => {
    //     console.error("Error fetching image files:", error);
    //   });

    // getFilesFromFolder(`projects/${this.projectId}/videoEditor/videos`)
    //   .then((urls) => {
    //     urls.forEach((url) => {
    //       this.videos.push(url);
    //     });
    //   })
    //   .catch((error) => {
    //     console.error("Error fetching video files:", error);
    //   });

    // getFilesFromFolder(`projects/${this.projectId}/videoEditor/audios`)
    //   .then((urls) => {
    //     urls.forEach((url) => {
    //       this.audios.push(url);
    //     });
    //   })
    //   .catch((error) => {
    //     console.error("Error fetching audio files:", error);
    //   });


    const db = getFirestore();
    const projectDocRef = doc(db, `projects/${this.projectId}`);
    onSnapshot(projectDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        
        if (data.background !== undefined) {
          this.setBackgroundColor(data.background, false);
          console.log("Background updated: ", data.background);
        }

        if (data.times !== undefined) {
          this.setMaxTime(data.times, false);
          console.log("Times updated: ", data.times);
        }
      } else {
        console.error("Project document does not exist.");
      }
    });

    onSnapshot(collection(db, `projects/${this.projectId}/videos`), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data: string = change.doc.data().url as unknown as string;

        if (change.type === "added") {
          this.addVideoResource(data, false);
          console.log("New animation: ", change.doc.data());
        }
      });
    });

    onSnapshot(collection(db, `projects/${this.projectId}/audios`), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data: string = change.doc.data().url as unknown as string;

        if (change.type === "added") {
          this.addAudioResource(data, false);
          console.log("New animation: ", change.doc.data());
        }
      });
    });

    onSnapshot(collection(db, `projects/${this.projectId}/images`), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data: string = change.doc.data().url as unknown as string;

        if (change.type === "added") {
          this.addImageResource(data, false);
          console.log("New animation: ", change.doc.data());
        }
      });
    });

    onSnapshot(collection(db, `projects/${this.projectId}/videoEditor`), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const element: EditorElement = {
          uid: change.doc.id,
          id: data.id,
          conflitId: null,
          name: data.name,
          type: data.type,
          order: data.order,
          placement: data.placement,
          timeFrame: data.timeFrame,
          properties: data.properties,
        };
        if(data.order >= this.order){
          this.order = data.order + 1;
        }
        if (change.type === "added") {
          this.addEditorElement(element, false);
          console.log("New element: ", change.doc.data());
        }
        else if (change.type === "modified") {
          if (this.selectedElement?.id === element.id) {
            const dif = diff(this.selectedElement, element);
            if ("fabricObject" in dif) {
              delete (dif as { fabricObject?: unknown }).fabricObject;
            }
            if (Object.keys(dif).length === 0) {
              return;
            }
            if (this.pendingMerge[element.id] == undefined) {
              this.pendingMerge[element.id] = {
                from: this.selectedElement,
                to: element,
                type: "updated",
              };
            } else {
              this.pendingMerge[element.id].to = element;
              this.pendingMerge[element.id].type = "updated";
            }
          } else {
            this.updateEditorElement(element, false);
            console.log("Modified element: ", change.doc.data());
          }
        }
        else if (change.type === "removed") {
          if (this.selectedElement?.id === element.id) {
            if (this.pendingMerge[element.id] == undefined) {
              this.pendingMerge[element.id] = {
                from: this.selectedElement,
                to: element,
                type: "deleted",
              };
            } else {
              this.pendingMerge[element.id].to = element;
              this.pendingMerge[element.id].type = "deleted";
            }
          } else {
            this.removeEditorElement(change.doc.data().id);
          }
        }
        this.refreshElements();
      });
    });

    onSnapshot(collection(db, `projects/${this.projectId}/animations`), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data: Animation = {
          ...change.doc.data(),
          uid: change.doc.id,
        } as Animation;

        if (change.type === "added") {
          this.addAnimation(data, false);
          console.log("New animation: ", change.doc.data());
        }
        if (change.type === "modified") {
          this.updateAnimation(data.id, data, false);
          console.log("Modified animation: ", change.doc.data());
        }
        if (change.type === "removed") {
          this.removeAnimation(data.id);
          console.log("Removed animation: ", change.doc.data());
        }
      });
    });
  }
}


export function isEditorAudioElement(
  element: EditorElement
): element is AudioEditorElement {
  return element.type === "audio";
}
export function isEditorVideoElement(
  element: EditorElement
): element is VideoEditorElement {
  return element.type === "video";
}

export function isEditorImageElement(
  element: EditorElement
): element is ImageEditorElement {
  return element.type === "image";
}


function getTextObjectsPartitionedByCharacters(textObject: fabric.Text, element: TextEditorElement): fabric.Text[] {
  let copyCharsObjects: fabric.Text[] = [];
  // replace all line endings with blank
  const characters = (textObject.text ?? "").split('').filter((m) => m !== '\n');
  const charObjects = textObject.__charBounds;
  if (!charObjects) return [];
  const charObjectFixed = charObjects.map((m, index) => m.slice(0, m.length - 1).map(m => ({ m, index }))).flat();
  const lineHeight = textObject.getHeightOfLine(0);
  for (let i = 0; i < characters.length; i++) {
    if (!charObjectFixed[i]) continue;
    const { m: charObject, index: lineIndex } = charObjectFixed[i];
    const char = characters[i];
    const scaleX = textObject.scaleX ?? 1;
    const scaleY = textObject.scaleY ?? 1;
    const charTextObject = new fabric.Text(char, {
      left: charObject.left * scaleX + (element.placement.x),
      scaleX: scaleX,
      scaleY: scaleY,
      top: lineIndex * lineHeight * scaleY + (element.placement.y),
      fontSize: textObject.fontSize,
      fontWeight: textObject.fontWeight,
      fill: '#fff',
    });
    copyCharsObjects.push(charTextObject);
  }
  return copyCharsObjects;
}
