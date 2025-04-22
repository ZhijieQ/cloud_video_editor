import { makeAutoObservable, remove } from 'mobx';
import { fabric } from 'fabric';
import { getUid, isHtmlAudioElement, isHtmlImageElement, isHtmlVideoElement } from '@/utils';
import anime, { get } from 'animejs';
import { MenuOption, EditorElement, Animation, TimeFrame, VideoEditorElement, AudioEditorElement, Placement, ImageEditorElement, Effect, TextEditorElement } from '../types';
import { FabricUitls } from '@/utils/fabric-utils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { getFirestore, collection, getDocs, setDoc, addDoc, deleteDoc, doc, onSnapshot, updateDoc, query, where, DocumentChange, QuerySnapshot } from 'firebase/firestore';
import { getFilesFromFolder } from "@/utils/fileUpload";
import { deepCopy, removeUndefinedFields } from './copy';
import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff';
import { useAuth } from '@/contexts/AuthContext';
import { User } from 'firebase/auth';

function mergeField(
  element: EditorElement,
  from: EditorElement,
  to: EditorElement,
  fieldName: string,
  diffFrom: Record<string, any>,
  diffTo: Record<string, any>
): boolean {
  if(fieldName in diffFrom && fieldName in diffTo) {
    const diffFieldFrom: Record<string, any> = diff((element as any)[fieldName], (from as any)[fieldName]);
    const diffFieldTo: Record<string, any> = diff((element as any)[fieldName], (to as any)[fieldName]);
    const combinedDiff: Record<string, any> = diff(diffFieldFrom, diffFieldTo);
    if (Object.keys(combinedDiff).length === 0) {
      for (const key in diffFieldFrom) {
        if (diffFieldFrom[key] !== undefined) {
          (element as any)[fieldName][key] = diffFieldFrom[key];
        }
      }
      for (const key in diffFieldTo) {
        if (diffFieldTo[key] !== undefined) {
          (element as any)[fieldName][key] = diffFieldTo[key];
        }
      }
    }else{
      // TODO: handle diff problem.
      return false;
    }
  }else if(fieldName in diffFrom) {
    (element as any)[fieldName] = (from as any)[fieldName];
  }else if(fieldName in diffTo) {
    (element as any)[fieldName] = (to as any)[fieldName];
  }
  return true;
}

function mergeElementUpdate(original: EditorElement, from: EditorElement, to: EditorElement){
  const diffFrom: Record<string, any> = diff(original, from);
  const diffTo: Record<string, any> = diff(original, to);
  if ('fabricObject' in diffFrom) {
    delete diffFrom.fabricObject;
  }
  if ('fabricObject' in diffTo) {
    delete diffTo.fabricObject;
  }

  const element = removeUndefinedFields(deepCopy(original));
  const normalChanges = ['placement', 'timeFrame', 'editPersonsId']
  for (const change of normalChanges){
    if(!mergeField(
      element, from, to, change,
      diffFrom, diffTo
    )){
      return null;
    }
  }

  return element;
}

function mergeElementDelete(original: EditorElement, from: EditorElement, to: EditorElement, projectId: string | null){
  addElementToFirestore(to, projectId);
  return to;
}

async function addElementToFirestore(editorElement: EditorElement, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot add element to Firestore.');
    return;
  }

  const db = getFirestore();
  const collec = collection(db, `projects/${projectId}/videoEditor`);
  try {
    if (editorElement.uid == null) {
      const docRef = await addDoc(collec, editorElement);
      editorElement.uid = docRef.id;
    } else {
      const docRef = doc(db, `projects/${projectId}/videoEditor`, editorElement.uid);
      await setDoc(docRef, editorElement);
    }
  } catch (error) {
    console.error('Error adding element to Firestore:', error);
    alert("Error synchronizing data.");
    return;
  }
}

async function addAnimationToFirestore(animation: Animation, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot add animation to Firestore.');
    return;
  }

  const db = getFirestore();
  const collec = collection(db, `projects/${projectId}/animations`);
  try {
    if (animation.uid == null) {
      const docRef = await addDoc(collec, animation);
      animation.uid = docRef.id;
    } else {
      const docRef = doc(db, `projects/${projectId}/animations`, animation.uid);
      await setDoc(docRef, animation);
    }
  } catch (error) {
    console.error('Error adding animation to Firestore:', error);
    alert("Error synchronizing animation data.");
    return;
  }
}

function uploadElementToFirebase(editorElement: EditorElement, projectId: string | null) {
  if (!projectId) {
    console.error("Project ID is null. Cannot upload element to Firebase.");
    return;
  }

  if (editorElement.uid == null) {
    console.log("Element UID is null");
    return;
  }

  try {
    const db = getFirestore();
    const docRef = doc(db, `projects/${projectId}/videoEditor`, editorElement.uid);
    const newEle = removeUndefinedFields(deepCopy(editorElement));
    updateDoc(docRef, newEle)
      .then(() => console.log(`Document with UID ${editorElement.uid} updated successfully`))
      .catch((error) => console.error("Error updating document in Firebase:", error));
  } catch (error) {
    console.error("Error updating document in Firebase:", error);
  }
}

function uploadAnimationToFirebase(animation: Animation){
  if(animation.uid == null){
    console.log("Element UID is null");
    return;
  }
  try {
    const db = getFirestore();
    const docRef = doc(db, "animations", animation.uid);
    updateDoc(docRef, animation)
        .then(() => console.log(`Document with UID ${animation.uid} updated successfully`))
        .catch((error) => console.error("Error updating document in Firebase:", error));
  } catch (error) {
    console.error("Error updating document in Firebase:", error);
  }
}

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
  // pendingMerge: EditorElement | null;
  unsubscribe: () => void;

  // Project ID to separate different projects
  projectId: string | null;
  user: User | null;

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
    this.unsubscribe = () => { };
    this.projectId = null;
    this.user = user;
    makeAutoObservable(this);
  }

  // set project ID
  setProjectId(projectId: string) {
    this.projectId = projectId;
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

  setBackgroundColor(backgroundColor: string) {
    this.backgroundColor = backgroundColor;
    if (this.canvas) {
      this.canvas.backgroundColor = backgroundColor;
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

  addVideoResource(video: string) {
    this.videos = [...this.videos, video];
  }
  addAudioResource(audio: string) {
    this.audios = [...this.audios, audio];
  }
  addImageResource(image: string) {
    this.images = [...this.images, image];
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

    uploadAnimationToFirebase(animation);
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
    if(id === undefined){
      alert("Element ID is undefined");
      return;
    }

    const ele = this.animations.find((e) => e.id === id);
    if(!ele || !ele.uid){
      return;
    }

    const db = getFirestore();
    const docRef = doc(db, "animations", ele.uid);
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
    if (this.canvas) {
      if (selectedElement?.fabricObject){
        if(!selectedElement.editPersonsId.includes(this.user!.uid)){
          selectedElement.editPersonsId.push(this.user!.uid);
          uploadElementToFirebase(selectedElement, this.projectId);
        }
        this.canvas.setActiveObject(selectedElement.fabricObject);
      }
      else{
        if(this.selectedElement?.editPersonsId.includes(this.user!.uid)){
          const element = this.mergeElement(
            this.pendingMerge[this.selectedElement.id]?.from,
            this.selectedElement,
            this.pendingMerge[this.selectedElement.id]?.to,
            this.pendingMerge[this.selectedElement.id]?.type
          );
          if(element){
            element.editPersonsId.filter((id: string) => id !== this.user!.uid);
            delete this.pendingMerge[this.selectedElement.id];
            this.updateEditorElement(element);
          }
        }
        this.canvas.discardActiveObject();
      }
    }
    this.selectedElement = selectedElement;
  }
  updateSelectedElement() {
    this.selectedElement = this.editorElements.find((element) => element.id === this.selectedElement?.id) ?? null;
  }

  mergeElement(original: EditorElement, from: EditorElement, to: EditorElement, type: 'deleted' | 'updated') {
    if(original === undefined || from === undefined || to === undefined) {
      return;
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
    this.refreshElements();
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
      this.refreshElements();
      this.setSelectedElement(this.editorElements[this.editorElements.length - 1]);
    }else {
      this.setEditorElements([...this.editorElements, editorElement]);
      this.refreshElements();
      this.setSelectedElement(this.editorElements[this.editorElements.length - 1]);
      await addElementToFirestore(editorElement, this.projectId);
    }
  }

  async removeEditorElement(id: string | undefined) {
    if (id === undefined) {
      alert("Element ID is undefined");
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

  setMaxTime(maxTime: number) {
    this.maxTime = maxTime;
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
        name: `Media(video) ${index + 1}`,
        type: "video",
        order: this.order++,
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
        editPersonsId: [
        ]
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
      name: `Media(image) ${index + 1}`,
      type: "image",
      order: this.order++,
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
      editPersonsId: [
      ]
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
        name: `Media(audio) ${index + 1}`,
        type: "audio",
        order: this.order++,
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
        editPersonsId: [
        ]
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
        name: `Text ${index + 1}`,
        type: "text",
        order: this.order++,
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
        editPersonsId: [
        ]
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
    const store = this;
    if (!store.canvas) return;
    const canvas = store.canvas;
    store.canvas.remove(...store.canvas.getObjects());
    for (let index = 0; index < store.editorElements.length; index++) {
      const element = store.editorElements[index];
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
          store.setSelectedElement(element);
        });
      }
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
  
    getFilesFromFolder(`projects/${this.projectId}/videoEditor/images`)
      .then((urls) => {
        urls.forEach((url) => {
          this.images.push(url);
        });
      })
      .catch((error) => {
        console.error("Error fetching image files:", error);
      });
  
    getFilesFromFolder(`projects/${this.projectId}/videoEditor/videos`)
      .then((urls) => {
        urls.forEach((url) => {
          this.videos.push(url);
        });
      })
      .catch((error) => {
        console.error("Error fetching video files:", error);
      });
  
    getFilesFromFolder(`projects/${this.projectId}/videoEditor/audios`)
      .then((urls) => {
        urls.forEach((url) => {
          this.audios.push(url);
        });
      })
      .catch((error) => {
        console.error("Error fetching audio files:", error);
      });
  
    const db = getFirestore();
    onSnapshot(collection(db, `projects/${this.projectId}/videoEditor`), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const element: EditorElement = {
          uid: change.doc.id,
          id: data.id,
          name: data.name,
          type: data.type,
          order: data.order,
          placement: data.placement,
          timeFrame: data.timeFrame,
          properties: data.properties,
          editPersonsId: data.editPersonsId,
        };
        if (change.type === "added") {
          this.addEditorElement(element, false);
          console.log("New element: ", change.doc.data());
        }
        if (change.type === "modified") {
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
        if (change.type === "removed") {
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
          console.log("Modified animation: ", change.doc.data());
        }
        if (change.type === "removed") {
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
