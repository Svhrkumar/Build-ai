import Image from "next/image";
import ChatPage from "./features/chat/page";


export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center !bg-white font-sans">
      <ChatPage />
     
    </div>
  );
}
