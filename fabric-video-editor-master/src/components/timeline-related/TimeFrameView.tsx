"use client";
import React from "react";
import { EditorElement } from "@/types";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import DragableView from "./DragableView";

export const TimeFrameView = observer((props: { element: EditorElement, ide: string }) => {
  const store = React.useContext(StoreContext);
  const { element, ide } = props;
  const disabled = element.type === "audio";
  const isSelected = store.selectedElement?.id === element.id;
  const bgColorOnSelected = isSelected ? "bg-slate-800" : "bg-slate-600";
  const disabledCursor = disabled ? "cursor-no-drop" : "cursor-ew-resize";

  return (
    <div
      onClick={() => {
        store.setSelectedElement(element);
      }}
      id={ide}
      key={element.id}
      className={`relative bg-gray-200 width-full h-[25px] my-2 ${
        isSelected ? "border-2 border-gray-600 bg-gray-200" : ""
      }`}
    >
      <DragableView
        container_id={ide}
        className="z-10"
        value={element.timeFrame.start}
        total={store.maxTime}
        disabled={disabled}
        onChange={(value) => {
          store.updateEditorElementTimeFrame(element, {
            start: value,
          });
        }}
      >
        <div
          className={`bg-white border-2 border-blue-400 w-[10px] h-[10px] mt-[calc(25px/2)] translate-y-[-50%] transform translate-x-[-50%] ${disabledCursor}`}
        ></div>
      </DragableView>
      <DragableView
        container_id={ide}
        className={disabled ? "cursor-no-drop" : "cursor-col-resize"}
        value={element.timeFrame.start}
        disabled={disabled}
        style={{
          width: `${
            ((element.timeFrame.end - element.timeFrame.start) /
              store.maxTime) *
            100
          }%`,
        }}
        total={store.maxTime}
        onChange={(value) => {
          const { start, end } = element.timeFrame;
          store.updateEditorElementTimeFrame(element, {
            start: value,
            end: value + (end - start),
          });
        }}
      >
        <div
          className={`${bgColorOnSelected} h-full w-full text-white text-xs min-w-[0px] px-2 leading-[25px]`}
        >
          {element.name}
        </div>
      </DragableView>
      <DragableView
        container_id={ide}
        className="z-10"
        disabled={disabled}
        value={element.timeFrame.end}
        total={store.maxTime}
        onChange={(value) => {
          store.updateEditorElementTimeFrame(element, {
            end: value,
          });
        }}
      >
        <div
          className={`bg-white border-2 border-blue-400 w-[10px] h-[10px] mt-[calc(25px/2)] translate-y-[-50%] transform translate-x-[-50%] ${disabledCursor}`}
        ></div>
      </DragableView>


      <div className={`absolute p-5 bg-purple-700 z-50 rounded-full left-0 top-1/2 transform -translate-y-1/2 -ml-10 ${isSelected ? 'block': 'hidden'}`}/>
    </div>
  );
});
