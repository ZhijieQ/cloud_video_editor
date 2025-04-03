import { EditorElement, VideoEditorElement, ImageEditorElement, AudioEditorElement, TextEditorElement } from "@/types";

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

export { deepCopy, removeUndefinedFields };