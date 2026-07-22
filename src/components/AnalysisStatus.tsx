"use client";

import { useEffect, useState } from "react";
import PusherClient from "pusher-js";

export default function AnalysisStatus({ channelId }: { channelId: string }) {
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`channel-${channelId}`);

    channel.bind("ai-status", (data: { message: string }) => {
      setStatus(data.message);
    });

    return () => {
      pusher.unsubscribe(`channel-${channelId}`);
    };
  }, [channelId]);

  return <div>Status: {status}</div>;
}