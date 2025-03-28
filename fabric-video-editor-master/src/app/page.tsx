<<<<<<< HEAD
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <a
        href="/editor"
        className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
        rel="noopener noreferrer"
      >
        <h2 className={`mb-3 text-2xl font-semibold`}>
          Go To Editor{" "}
          <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
            -&gt;
          </span>
        </h2>
        <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
          Created By Amit Digga
        </p>
      </a>
=======
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <header className="w-full py-6 px-8 flex justify-between items-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Cloud Video Editor
        </div>
        <div className="flex gap-4">
          <Link 
            href="/login" 
            className="px-4 py-2 text-sm font-medium text-white hover:text-blue-400 transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/signup" 
            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:opacity-90 transition-opacity"
          >
            Sign Up
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center px-8 md:px-16 py-10 gap-12">
        <div className="flex-1 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Create Professional Videos in Your Browser
          </h1>
          <p className="text-gray-300 mb-8 text-lg">
            A powerful web-based video editor with animations, effects, and timeline functionality.
            Edit your videos anywhere, anytime - no installation required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/signup" 
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
            <Link 
              href="/editor" 
              className="px-6 py-3 bg-slate-700 text-white rounded-lg font-medium text-center hover:bg-slate-600 transition-colors"
            >
              Try Editor Demo
            </Link>
          </div>
        </div>

        <div className="relative w-full max-w-md h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-2xl">
          <Image 
            src="https://images.unsplash.com/photo-1528109966604-5a6a4a964e8d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
            alt="Video Editing" 
            fill 
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-6">
            <div className="text-white">
              <div className="text-lg font-semibold">Powerful Features</div>
              <p className="text-sm opacity-80">Animations, Effects, Timeline & More</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full py-4 text-center text-gray-400 text-sm">
        <p>Cloud Video Editor</p>
      </footer>
>>>>>>> 279f1acc32f96a40010c14d81d3dc8c742becb77
    </main>
  );
}
