import { MenuOption, EditorElement, Animation, TimeFrame, VideoEditorElement, AudioEditorElement, Placement, ImageEditorElement, Effect, TextEditorElement } from '../types';
import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff';
import { getFirestore, collection, getDocs, setDoc, addDoc, deleteDoc, doc, onSnapshot, updateDoc, query, where, DocumentChange, QuerySnapshot } from 'firebase/firestore';


function deepCopy(element: EditorElement): EditorElement {
  switch (element.type) {
    case "video":
      return {
        ...element,
        fabricObject: undefined, // Exclude fabricObject
        properties: { 
          ...element.properties, 
          imageObject: undefined // Exclude imageObject
        },
        placement: { ...element.placement },
        timeFrame: { ...element.timeFrame },
      } as VideoEditorElement;
    case "image":
      return {
        ...element,
        fabricObject: undefined, // Exclude fabricObject
        properties: { 
          ...element.properties, 
          imageObject: undefined, // Exclude imageObject
          effect: { ...element.properties.effect }, // Clone the proxy effect
        },
        placement: { ...element.placement },
        timeFrame: { ...element.timeFrame },
      } as ImageEditorElement;
    case "audio":
      return {
        ...element,
        fabricObject: undefined, // Exclude fabricObject
        properties: { ...element.properties },
        placement: { ...element.placement },
        timeFrame: { ...element.timeFrame },
      } as AudioEditorElement;
    case "text":
      return {
        ...element,
        fabricObject: undefined, // Exclude fabricObject
        properties: {
          ...element.properties,
          splittedTexts: element.properties.splittedTexts.map((text) => ({ ...text })),
        },
        placement: { ...element.placement },
        timeFrame: { ...element.timeFrame },
      } as TextEditorElement;
    default:
      throw new Error(`Unsupported EditorElement type: ${(element as EditorElement).type}`);
  }
}

/**
 * Recursively removes all `undefined` fields from an object.
 * @param obj The object to clean.
 * @returns A new object with all `undefined` fields removed.
 */
function removeUndefinedFields(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields); // Recursively clean arrays
  } else if (obj && typeof obj === "object") {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = removeUndefinedFields(value); // Recursively clean nested objects
      }
      return acc;
    }, {} as any);
  }
  return obj; // Return primitive values as-is
}

const mergeField = function (
  element: EditorElement,
  from: EditorElement,
  to: EditorElement,
  fieldName: string,
  diffFrom: Record<string, any>,
  diffTo: Record<string, any>
): boolean {
  if (fieldName in diffFrom && fieldName in diffTo) {
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
    } else {
      // TODO: handle diff problem.
      return false;
    }
  } else if (fieldName in diffFrom) {
    (element as any)[fieldName] = (from as any)[fieldName];
  } else if (fieldName in diffTo) {
    (element as any)[fieldName] = (to as any)[fieldName];
  }
  return true;
};

const mergeElementUpdate = function (original: EditorElement, from: EditorElement, to: EditorElement) {
  const diffFrom: Record<string, any> = diff(original, from);
  const diffTo: Record<string, any> = diff(original, to);
  if ('fabricObject' in diffFrom) {
    delete diffFrom.fabricObject;
  }
  if ('fabricObject' in diffTo) {
    delete diffTo.fabricObject;
  }

  const element = removeUndefinedFields(deepCopy(original));
  const normalChanges = ['order', 'placement', 'timeFrame', 'editPersonsId', 'properties'];
  for (const change of normalChanges) {
    if (
      !mergeField(
        element,
        from,
        to,
        change,
        diffFrom,
        diffTo
      )
    ) {
      return null;
    }
  }

  return element;
};

const mergeElementDelete = function (original: EditorElement, from: EditorElement, to: EditorElement, projectId: string | null) {
  addElementToFirestore(to, projectId);
  return to;
};

const addFileUrlsToFirestore = async function (url: string, projectId: string, path: string) {
  const db = getFirestore();
  const collec = collection(db, `projects/${projectId}/${path}`);
  
  try {
    const docRef = await addDoc(collec, { url });
    console.log(`URL added successfully with ID: ${docRef.id}`);
  } catch (error) {
    console.error('Error adding URL to Firestore:', error);
  }
};

const addBackgroundToFirestore = async function (background: string, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot update background in Firestore.');
    return;
  }

  const db = getFirestore();
  const projectDocRef = doc(db, `projects/${projectId}`);
  try {
    await updateDoc(projectDocRef, { background });
    console.log('Background updated successfully.');
  } catch (error) {
    console.error('Error updating background in Firestore:', error);
  }
};

const addTimesToFirestore = async function (times: number, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot update times in Firestore.');
    return;
  }

  const db = getFirestore();
  const projectDocRef = doc(db, `projects/${projectId}`);
  try {
    await updateDoc(projectDocRef, { times });
    console.log('Times updated successfully.');
  } catch (error) {
    console.error('Error updating times in Firestore:', error);
  }
};

const addElementToFirestore = async function (editorElement: EditorElement, projectId: string | null) {
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
    alert('Error synchronizing data.');
    return;
  }
};

const addAnimationToFirestore = async function (animation: Animation, projectId: string | null) {
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
      await setDoc(docRef, animation, { merge: true });
    }
  } catch (error) {
    console.error('Error adding animation to Firestore:', error);
    alert('Error synchronizing animation data.');
    return;
  }
};

const uploadElementToFirebase = function (editorElement: EditorElement, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot upload element to Firebase.');
    return;
  }

  if (editorElement.uid == null) {
    console.log('Element UID is null');
    return;
  }

  try {
    const db = getFirestore();
    const docRef = doc(db, `projects/${projectId}/videoEditor`, editorElement.uid);
    const newEle = removeUndefinedFields(deepCopy(editorElement));
    updateDoc(docRef, newEle, { merge: true })
      .then(() => console.log(`Document with UID ${editorElement.uid} updated successfully`))
      .catch((error) => console.error('Error updating document in Firebase:', error));
  } catch (error) {
    console.error('Error updating document in Firebase:', error);
  }
};

const uploadAnimationToFirebase = function (animation: Animation, projectId: string | null) {
  if (!projectId) {
    console.error('Project ID is null. Cannot upload animation to Firebase.');
    alert('Error: Project ID is missing.');
    return;
  }
  if (animation.uid == null) {
    console.log('Element UID is null');
    return;
  }
  try {
    const db = getFirestore();
    const docRef = doc(db, `projects/${projectId}/animations`, animation.uid);
    updateDoc(docRef, animation as any, { merge: true })
      .then(() => console.log(`Document with UID ${animation.uid} updated successfully`))
      .catch((error) => console.error('Error updating document in Firebase:', error));
  } catch (error) {
    console.error('Error updating document in Firebase:', error);
  }
};

export {
  deepCopy,
  removeUndefinedFields,
  mergeElementUpdate,
  mergeElementDelete,
  addElementToFirestore,
  addAnimationToFirestore,
  uploadElementToFirebase,
  uploadAnimationToFirebase,
  addBackgroundToFirestore,
  addTimesToFirestore,
  addFileUrlsToFirestore
};