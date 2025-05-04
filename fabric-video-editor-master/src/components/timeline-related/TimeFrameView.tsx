"use client";
import React, { useState, useEffect } from "react";
import { EditorElement } from "@/types";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import DragableView from "./DragableView";
import { getUserBorderColor, getUserBgColor } from "@/utils/userColors";
import { UserInfo } from "@/services/userService";

export const TimeFrameView = observer((props: { element: EditorElement, ide: string }) => {
  const store = React.useContext(StoreContext);
  const { element, ide } = props;
  const disabled = element.type === "audio";
  const isSelected = store.selectedElement?.id === element.id;
  // get last editor color
  const lastEditorId = element.editPersonsId && element.editPersonsId.length > 0 ? element.editPersonsId[element.editPersonsId.length - 1] : null;
  const lastEditorColor = lastEditorId ? getUserBgColor(lastEditorId) : '';
  const bgColorOnSelected = isSelected ? "bg-slate-800" : lastEditorColor || "bg-slate-600";
  const [showTooltip, setShowTooltip] = useState(false);
  const [usersInfo, setUsersInfo] = useState<Record<string, UserInfo>>({});
  const disabledCursor = disabled ? "cursor-no-drop" : "cursor-ew-resize";

  // hover get user info
  useEffect(() => {
    if (showTooltip && element.editPersonsId && element.editPersonsId.length > 0) {
      const fetchUsersInfo = async () => {
        await store.getUsersInfo(element.editPersonsId);

        const info: Record<string, UserInfo> = {};
        for (const userId of element.editPersonsId) {
          const userInfo = store.userInfoCache[userId];
          if (userInfo) {
            info[userId] = userInfo;
          }
        }

        setUsersInfo(info);
      };

      fetchUsersInfo();
    }
  }, [showTooltip, element.editPersonsId, store]);

  return (
    <div
      onClick={() => {
        store.setSelectedElement(element);
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
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
          className={`${bgColorOnSelected} h-full w-full text-white text-xs min-w-[0px] px-2 leading-[25px] flex items-center`}
        >
          {element.name}
          {lastEditorId && !isSelected && (
            <span
              className={`ml-1 h-3 w-3 rounded-full inline-block flex-shrink-0 ${lastEditorColor.replace('bg-', 'bg-')}`}
              title={usersInfo[lastEditorId]?.displayName || store.userInfoCache[lastEditorId]?.displayName || `User ${lastEditorId.substring(0, 8)}`}
            ></span>
          )}
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

      {/* hover tooltip */}
      {showTooltip && element.editPersonsId && element.editPersonsId.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-gray-800 rounded-md shadow-lg p-2 w-64">
          <div className="text-xs text-white font-medium mb-1">Modified by：</div>
          {lastEditorId && (
            <div className="text-xs text-white mb-2">
              <span className="font-medium">Last Editor：</span>
              <span className={`inline-block w-3 h-3 rounded-full ${lastEditorColor} ml-1 mr-1`}></span>
              {usersInfo[lastEditorId]?.displayName || store.userInfoCache[lastEditorId]?.displayName || `User ${lastEditorId.substring(0, 8)}`}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {element.editPersonsId.map((userId) => {
              // get user info from cache
              const userInfo = usersInfo[userId] || store.userInfoCache[userId];
              // online users
              const onlineUser = store.onlineUsers.find(u => u.uid === userId);
              // current user
              const isCurrentUser = store.user && store.user.uid === userId;

              return (
                <div key={userId} className="flex items-center gap-1 bg-gray-700 rounded-md p-1">
                  {userInfo ? (
                    <>
                      {userInfo.photoURL ? (
                        <img
                          src={userInfo.photoURL}
                          alt={userInfo.displayName}
                          className={`h-5 w-5 rounded-full border ${getUserBorderColor(userId)}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${getUserBgColor(userId)}`}
                        >
                          {userInfo.displayName[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-white">
                        {userInfo.displayName}
                        {onlineUser && <span className="ml-1 h-2 w-2 inline-block bg-green-500 rounded-full"></span>}
                      </span>
                    </>
                  ) : isCurrentUser && store.user ? (
                    <>
                      {store.user.photoURL ? (
                        <img
                          src={store.user.photoURL}
                          alt={store.user.displayName || store.user.email?.split('@')[0] || 'Current User'}
                          className={`h-5 w-5 rounded-full border ${getUserBorderColor(userId)}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${getUserBgColor(userId)}`}
                        >
                          {(store.user.displayName || store.user.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-white">
                        {store.user.displayName || store.user.email?.split('@')[0] || 'Current User'}
                        <span className="ml-1 h-2 w-2 inline-block bg-green-500 rounded-full"></span>
                      </span>
                    </>
                  ) : (
                    <>
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${getUserBgColor(userId)}`}
                      >
                        ?
                      </div>
                      <span className="text-xs text-white">User {userId.substring(0, 12)}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
