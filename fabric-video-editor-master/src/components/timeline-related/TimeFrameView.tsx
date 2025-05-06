"use client";
import React from "react";
import { EditorElement } from "@/types";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import DragableView from "./DragableView";
import { getUserBgColor } from '@/utils/userColors';
import { getTailwindColorValue } from '@/utils/colorUtils';

export const TimeFrameView = observer((props: { element: EditorElement, ide: string }) => {
  const store = React.useContext(StoreContext);
  const { element, ide } = props;
  const disabled = element.type === "audio";
  const isSelected = store.selectedElement?.id === element.id;

  // Check if element is being edited by an online user
  const getEditorColor = () => {
    // If no editors, return null
    if (!element.editPersonsId || element.editPersonsId.length === 0) {
      return null;
    }

    // Check if any of the editors are online
    for (const editorId of element.editPersonsId) {
      // Make sure onlineUsers exists and is an array
      if (store.onlineUsers && Array.isArray(store.onlineUsers)) {
        const onlineUser = store.onlineUsers.find(user => user && user.uid === editorId);
        if (onlineUser) {
          // User is online, return their color
          const bgClass = getUserBgColor(editorId);
          return getTailwindColorValue(bgClass);
        }
      }
    }

    // No online editors found
    return null;
  };

  // Use React.useMemo to optimize performance
  const editorColor = React.useMemo(() => getEditorColor(), [element.editPersonsId, store.onlineUsers]);

  // Use editor color if available, otherwise use default colors
  const bgColorOnSelected = editorColor ?
    undefined : // Will use inline style instead
    (isSelected ? "bg-slate-800" : "bg-slate-600");

  // Apply a lighter version of the editor color for better visibility
  const getBackgroundColor = () => {
    if (!editorColor) return undefined;

    // Convert hex to rgba with transparency for a lighter effect
    const hexToRgba = (hex: string, alpha: number = 0.3) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return hexToRgba(editorColor);
  };

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
          className={`${bgColorOnSelected || ''} h-full w-full text-white text-xs min-w-[0px] px-2 leading-[25px]`}
          style={editorColor ? {
            backgroundColor: getBackgroundColor(),
            borderColor: editorColor,
            borderWidth: '2px',
            borderStyle: 'solid'
          } : undefined}
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

    </div>
  );
});
