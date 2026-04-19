import { ChatWindow } from '@/components/studio/ChatBox';
import { AppSidebar } from '@/components/studio/sidebar';

export default function StudioPage() {
  return (
    <div className="flex h-full w-full">
      <div className="flex-1">
        <ChatWindow />
      </div>
    </div>
  );
}
