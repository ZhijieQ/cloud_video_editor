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

export const EditorWithStore = () => {
  const [store] = useState(new Store());
  return (
    <StoreContext.Provider value={store}>
      <Editor></Editor>
    </StoreContext.Provider>
  );
}

export const Editor = observer(() => {
  const store = React.useContext(StoreContext);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const usersConected = [
    {nombre: "Zhijie", foto: ""},
    {nombre: "Don", foto: ""},
    {nombre: "Ander", foto: ""},
    {nombre: "Martin", foto: ""},
  ]

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
        <div className="absolute left-0 ml-10 text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Cloud Video Editor
        </div>
        { isAuthenticated ? (
          <>
          <div className="relative flex items-center">
            <p className="text-white flex items-center gap-x-4 mr-5">
              Live Users
              <span className="h-3 w-3 bg-green-500 rounded-full animate-pulse mr-2" />
            </p>
            { usersConected.map((user, index) => (
                <img className={`h-10 w-10 rounded-full bg-gray-100 -ml-2 hover:scale-110 ring-1 
                            ${index % 4 === 0 ? 'ring-red-500' : 
                              index % 4 === 1 ? 'ring-blue-500' : 
                              index % 4 === 2 ? 'ring-green-500' : 
                              'ring-yellow-500'}`}/>
                
              ))
            }
          </div>
          <button className="h-10 w-10 rounded-full bg-gray-200" onClick={()=>setIsAuthenticated(false)}/>
          </>
        ):(
          <button className="text-white font-normal hover:text-purple-500" onClick={()=>setIsAuthenticated(true)}>
            Iniciar sesión
          </button>
        )
        }
       
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
      {/* <div className="col-start-4 row-start-2">
        <ElementsPanel />
      </div> */}
      <div className="col-start-3 row-start-3 col-span-2 relative px-[10px] py-[4px] overflow-scroll">
        <TimeLine />
      </div>
      <div className="col-span-4 text-right px-2 text-[0.5em] bg-black text-white">
        Credits to Amit Digga
      </div>
    </div>
  );
});
