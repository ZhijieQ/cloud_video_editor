"use client";
import React from "react";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import {
  MdDownload,
  MdVideoLibrary,
  MdImage,
  MdTransform,
  MdTitle,
  MdAudiotrack,
  MdOutlineFormatColorFill,
  MdMovieFilter,
} from "react-icons/md";
import { Store } from "@/store/Store";

export const Menu = observer(() => {
  const store = React.useContext(StoreContext);

  return (
    <ul className="bg-black h-full flex flex-col items-center">
      {MENU_OPTIONS.map((option) => {
        const isSelected = store.selectedMenuOption === option.name;
        return (
          <li
            key={option.name}
            className={`mt-4 h-[50px] w-[50px] rounded-2xl flex flex-col items-center justify-center ${isSelected ? "bg-gray-300" : " hover:bg-gray-800"}`}
          >
            <button
              onClick={() => option.action(store)}
              className={`flex flex-col items-center`}
            >
              <option.icon
                size="20"
                color={
                  isSelected ? "#000" : "white"
                }
              />
              <div
                className={`text-[0.6rem] ${isSelected ? "text-black" : "text-slate-200"}`}
              >
                {option.name}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
});

const MENU_OPTIONS = [
  {
    name: "Video",
    icon: MdVideoLibrary,
    action: (store: Store) => {
      store.setSelectedMenuOption("Video");
    },
  },
  {
    name: "Audio",
    icon: MdAudiotrack,
    action: (store: Store) => {
      store.setSelectedMenuOption("Audio");
    },
  },
  {
    name: "Image",
    icon: MdImage,
    action: (store: Store) => {
      store.setSelectedMenuOption("Image");
    },
  },
  {
    name: "Text",
    icon: MdTitle,
    action: (store: Store) => {
      store.setSelectedMenuOption("Text");
    },
  },
  {
    name: "Animation",
    icon: MdTransform,
    action: (store: Store) => {
      store.setSelectedMenuOption("Animation");
    },
  },
  {
    name: "Effect",
    icon: MdMovieFilter,
    action: (store: Store) => {
      store.setSelectedMenuOption("Effect");
    },
  },
  {
    name: "Fill",
    icon: MdOutlineFormatColorFill,
    action: (store: Store) => {
      store.setSelectedMenuOption("Fill");
    },
  },
  {
    name: "Export",
    icon: MdDownload,
    action: (store: Store) => {
      store.setSelectedMenuOption("Export");
    },
  },
];
