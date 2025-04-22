"use client";

import { fabric } from "fabric";
import React, { useEffect, useState } from "react";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import { Resources } from "./Resources";
import { ElementsPanel } from "./panels/ElementsPanel";
import { Menu } from "./Menu";
import { TimeLine } from "./TimeLine";
import { Store } from "@/store/Store";
import "@/utils/fabric-utils";
import { useAuth } from "@/contexts/AuthContext";
import { ChatPanel } from "./chat/ChatPanel";
import { ChatButton } from "./chat/ChatButton";
import { subscribeToOnlineUsers, setUserOnlineStatus } from "@/services/presenceService";
import { OnlineUserAvatars } from "./chat/OnlineUserAvatars";
import { UserMenu } from "./common/UserMenu";
import { ShareProject } from "./common/ShareProject";

interface EditorWithStoreProps {
  projectId: string;
  projectName?: string;
  userRole?: 'owner' | 'editor' | 'viewer' | null;
  ownerId?: string;
}

export const EditorWithStore = ({ projectId, projectName, userRole, ownerId }: EditorWithStoreProps) => {
  const { currentUser } = useAuth();
  const [store] = useState(new Store(currentUser));

  // Use project id to inicial Store
  useEffect(() => {
    if (projectId) {
      store.setProjectId(projectId);
      store.sync();
    }
  }, [projectId]);

  return (
    <StoreContext.Provider value={store}>
      <Editor
        projectId={projectId}
        projectName={projectName}
        userRole={userRole}
        ownerId={ownerId}
      />
    </StoreContext.Provider>
  );
}

interface EditorProps {
  projectId: string;
  projectName?: string;
  userRole?: 'owner' | 'editor' | 'viewer' | null;
  ownerId?: string;
}

export const Editor = observer((props: EditorProps) => {
  const { projectId, projectName, userRole, ownerId } = props;
  const store = React.useContext(StoreContext);
  const { currentUser, getProfilePhotoURL } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // check user roles
  const canEdit = userRole === 'owner' || userRole === 'editor';

  // Set user online status and subscribe to online users
  useEffect(() => {
    if (!currentUser) return;

    // Set user online status
    const cleanupPresence = setUserOnlineStatus(projectId, currentUser.uid, {
      displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      photoURL: getProfilePhotoURL(),
      lastActive: Date.now()
    });

    // Subscribe to online users
    const unsubscribeUsers = subscribeToOnlineUsers(
      projectId,
      currentUser.uid,
      (users) => {
        setOnlineUsers(users);
      }
    );

    // Periodically update user's last active time
    const activityInterval = setInterval(() => {
      setUserOnlineStatus(projectId, currentUser.uid, {
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        photoURL: getProfilePhotoURL(),
        lastActive: Date.now()
      });
    }, 5000); // Update every 5 seconds

    return () => {
      unsubscribeUsers();
      cleanupPresence();
      clearInterval(activityInterval);
    };
  }, [projectId, currentUser, getProfilePhotoURL]);

  // chat button click
  const handleChatButtonClick = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const canvas = new fabric.Canvas("canvas", {
      height: 500,
      width: 800,
      backgroundColor: "#ededed",
    });
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = "#00a0f5";
    fabric.Object.prototype.cornerStyle = "circle";
    fabric.Object.prototype.cornerStrokeColor = "#0063d8";
    fabric.Object.prototype.cornerSize = 10;
    // canvas mouse down without target should deselect active object
    canvas.on("mouse:down", function (e) {
      if (!e.target) {
        store.setSelectedElement(null);
      }
    });

    store.setCanvas(canvas);
    fabric.util.requestAnimFrame(function render() {
      canvas.renderAll();
      fabric.util.requestAnimFrame(render);
    });
  }, []);
  return (
    <div className="grid grid-rows-[60px_500px_1fr_20px] grid-cols-[72px_300px_1fr_250px] h-[100svh]">

      <div className="relative col-span-4 bg-black px-10 py-2 flex justify-end items-center gap-x-32">
        <div className="absolute left-0 ml-10 flex items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Cloud Video Editor
          </div>
          {projectName && (
            <div className="ml-4 text-gray-300 flex items-center">
              <span className="mx-2 text-gray-600">/</span>
              <span className="font-medium">{projectName}</span>
              {userRole && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-900 text-blue-300">
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </span>
              )}
              {userRole === 'owner' && (
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="ml-4 px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share Project
                </button>
              )}
            </div>
          )}
        </div>
        <>
          <div className="relative flex items-center">
            <p className="text-white flex items-center gap-x-4 mr-5">
              Live Users
              <span className="h-3 w-3 bg-green-500 rounded-full animate-pulse mr-2" />
            </p>
            <OnlineUserAvatars users={onlineUsers} />
          </div>
          {/* User Menu */}
          <UserMenu className="ml-4" />
        </>

      </div>
      <div className="tile row-span-2 flex flex-col row-start-2">
        <Menu />
      </div>
      <div className="row-span-2 flex flex-col overflow-scroll row-start-2 bg-black" style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none"
        }}>
        <Resources />
      </div>
      <div id="grid-canvas-container" className="col-start-3 bg-slate-100 flex justify-center items-center">
        <canvas id="canvas" className="h-[500px] w-[800px] row" />
      </div>
      <div className="col-start-4 row-start-2">
        <ElementsPanel />
      </div>
      <div className="col-start-3 row-start-3 col-span-2 relative px-[10px] py-[4px] overflow-scroll">
        <TimeLine />
      </div>
      <div className="col-span-4 text-right px-2 text-[0.5em] bg-black text-white">
        Credits to Amit Digga
      </div>

      {/* chat botton and chat panel */}
      {currentUser && (
        <>
          <ChatButton
            onClick={handleChatButtonClick}
            isOpen={isChatOpen}
            unreadCount={unreadCount}
          />
          <ChatPanel
            projectId={projectId}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
        </>
      )}

      {/* Share Project Modal */}
      <ShareProject
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectId={projectId}
        currentUserRole={userRole || null}
      />
    </div>
  );
});
