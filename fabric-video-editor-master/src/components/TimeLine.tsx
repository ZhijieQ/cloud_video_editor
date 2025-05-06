"use client";
import React from "react";
import { SeekPlayer } from "./timeline-related/SeekPlayer";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import { TimeFrameView } from "./timeline-related/TimeFrameView";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EditorElement } from "@/types";

const SortableTimeFrameView = ({ element }: { element: any }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative"
    >
      <TimeFrameView ide={`barrita_${element.id}`} element={element} />

      <div
        {...listeners}
        className={`absolute px-1 py-2 cursor-grab active:cursor-grabbing bg-blue-500 z-50 rounded-full -left-2.5 top-1/2 transform -translate-y-1/2`}
      />
    </div>
  );
};

export const TimeLine = observer(() => {
  const store = React.useContext(StoreContext);
  const sensors = useSensors(useSensor(PointerSensor));
  var allElements = [...store.editorElements, ...Object.values(store.conflit)].sort((a, b) => a.order - b.order);
  const percentOfCurrentTime = (store.currentTimeInMs / store.maxTime) * 100;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    var oldIndex = store.editorElements.find((el) => el.id ===  active.id)!.order;
    var newIndex = store.editorElements.find((el) => el.id === over.id)!.order;

    // if(Math.abs(oldIndex - newIndex) > 1){
    //   const tmp = oldIndex;
    //   oldIndex = newIndex;
    //   newIndex = tmp;
    // }
    const elements = store.editorElements.sort((a, b) => a.order - b.order);
    const oldEle = popElementByIndex(elements, oldIndex);
    const reordered = insertElementAtIndex(elements, newIndex, oldEle!);
    const changed:EditorElement[] = [];
    reordered.forEach((el, idx) => {
      if (el.order != idx) {
        changed.push({ ...el, order: idx });
      }
    });
    
    // Iterate through changed elements and call updateEditorElement
    changed.forEach((element) => {
      store.updateEditorElement(element);
    });
  };

  function popElementByIndex(arr: EditorElement[], index: number) {
    if (index >= 0 && index < arr.length) {
      return arr.splice(index, 1)[0]; // Remove 1 element at the given index and return the removed element
    } else {
      return undefined; // Or throw an error, depending on your preference for out-of-bounds indices
    }
  }

  function insertElementAtIndex(arr: EditorElement[], index: number, element: EditorElement) {
    arr.splice(index, 0, element);
    return arr; // Returns the modified array for convenience
  }

  return (
    <div className="flex flex-col">
      <SeekPlayer />
      <div className="flex-1 relative">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allElements.map((el) => el.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col">
            {allElements.map((element) => (
              <SortableTimeFrameView
                key={element.id}
                element={element}
              />
            ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Línea roja de tiempo */}
        <div
          className="w-[2px] bg-red-400 absolute top-0 bottom-0 z-20"
          style={{ left: `${percentOfCurrentTime}%` }}
        ></div>
      </div>
    </div>
  );
});
