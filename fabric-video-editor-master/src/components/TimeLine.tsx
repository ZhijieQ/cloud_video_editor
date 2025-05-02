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

  const percentOfCurrentTime = (store.currentTimeInMs / store.maxTime) * 100;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = store.editorElements.findIndex((el) => el.id === active.id);
    const newIndex = store.editorElements.findIndex((el) => el.id === over.id);

    const reordered = arrayMove(store.editorElements.slice(), oldIndex, newIndex);
    // TODO: almacena la lista de los elem que se ha cambiado y llama setEditorElements.
    const updatedElements = reordered.map((el, idx) => ({
      ...el,
      order: idx,
    }));
    store.setEditorElements(updatedElements, true);
  };

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
            items={store.editorElements.map((el) => el.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col">
            {store.editorElements.map((element) => (
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
