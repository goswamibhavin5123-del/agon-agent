import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import type { RemoteTrack } from 'livekit-client';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Loader2 } from 'lucide-react';

/**
 * Real-time audio/video via LiveKit. Tokens are minted server-side for the specific consultation room;
 * the API secret never reaches the browser. Billing is decided by the server from LiveKit room presence.
 */
export default function CallRoom({ getToken, video, peerName, peerPhoto, onEnd, ending, children }: {
  getToken: () => Promise<{ token: string; url: string }>; video: boolean; peerName: string; peerPhoto?: string; onEnd: () => void; ending?: boolean; children?: React.ReactNode;
}) {
  const [state, setState] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [err, setErr] = useState('');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [peerHere, setPeerHere] = useState(false);
  const [peerVideo, setPeerVideo] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const audioBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    const attach = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && remoteVideo.current) { track.attach(remoteVideo.current); setPeerVideo(true); }
      if (track.kind === Track.Kind.Audio && audioBox.current) { const el = track.attach(); audioBox.current.appendChild(el); }
    };
    room.on(RoomEvent.TrackSubscribed, (t) => attach(t as RemoteTrack));
    room.on(RoomEvent.TrackUnsubscribed, (t) => { t.detach().forEach((e) => e.remove()); if (t.kind === Track.Kind.Video) setPeerVideo(false); });
    room.on(RoomEvent.ParticipantConnected, () => setPeerHere(true));
    room.on(RoomEvent.ParticipantDisconnected, () => { setPeerHere(room.remoteParticipants.size > 0); });
    room.on(RoomEvent.Disconnected, () => { if (!cancelled) setState('error'); });
    (async () => {
      try {
        const { token, url } = await getToken();
        if (cancelled) return;
        await room.connect(url, token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (video) {
          await room.localParticipant.setCameraEnabled(true);
          const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (pub?.track && localVideo.current) pub.track.attach(localVideo.current);
        }
        room.remoteParticipants.forEach((p) => { setPeerHere(true); p.trackPublications.forEach((pub) => pub.track && attach(pub.track as RemoteTrack)); });
        setState('connected');
      } catch (e: any) {
        if (!cancelled) { setErr(e?.message || 'Could not connect to the call'); setState('error'); }
      }
    })();
    return () => { cancelled = true; room.disconnect(); };
  }, []);

  useEffect(() => { roomRef.current?.localParticipant.setMicrophoneEnabled(!muted).catch(() => {}); }, [muted]);
  useEffect(() => { if (video) roomRef.current?.localParticipant.setCameraEnabled(!camOff).catch(() => {}); }, [camOff, video]);

  return (
    <div className="absolute inset-0 bg-plum-deep overflow-hidden">
      <div ref={audioBox} className="hidden" />
      <video ref={remoteVideo} autoPlay playsInline className={`absolute inset-0 h-full w-full object-cover ${video && peerVideo ? '' : 'hidden'}`} />
      {!(video && peerVideo) && (
        <div className="absolute inset-0 bg-plum-grad flex flex-col items-center justify-center text-white">
          <div className="relative">
            {peerHere && [0, 1, 2].map((i) => <span key={i} className="absolute inset-0 rounded-full border-2 border-gold-light/40 animate-pulse-ring" style={{ animationDelay: `${i * 0.7}s` }} />)}
            <div className="relative h-40 w-40 rounded-full p-1 bg-gold-grad">{peerPhoto ? <img src={peerPhoto} className="h-full w-full rounded-full object-cover" alt="" /> : <div className="h-full w-full rounded-full bg-plum" />}</div>
          </div>
          <p className="font-serif text-3xl mt-8">{peerName}</p>
          <p className="text-gold-light/80 text-sm mt-1 flex items-center gap-2">
            {state === 'connecting' && <><Loader2 className="h-4 w-4 animate-spin" /> Connecting securely…</>}
            {state === 'connected' && (peerHere ? 'Connected' : <><Loader2 className="h-4 w-4 animate-spin" /> Ringing… billing starts when they join</>)}
            {state === 'error' && (err || 'Call disconnected')}
          </p>
        </div>
      )}
      {video && state === 'connected' && (
        <div className="absolute top-4 right-4 w-28 sm:w-40 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 bg-plum shadow-2xl">
          {camOff ? <div className="h-full w-full flex items-center justify-center text-white/60"><VideoOff className="h-6 w-6" /></div> : <video ref={localVideo} autoPlay muted playsInline className="h-full w-full object-cover -scale-x-100" />}
        </div>
      )}
      {children}
      <div className="absolute bottom-6 inset-x-0 flex justify-center">
        <div className="flex items-center gap-3 rounded-full bg-black/35 backdrop-blur-xl px-4 py-3 border border-white/10">
          <button onClick={() => setMuted(!muted)} className={`h-12 w-12 rounded-full flex items-center justify-center ${muted ? 'bg-white text-plum' : 'bg-white/15 text-white'}`} aria-label="Mute">{muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
          {video && <button onClick={() => setCamOff(!camOff)} className={`h-12 w-12 rounded-full flex items-center justify-center ${camOff ? 'bg-white text-plum' : 'bg-white/15 text-white'}`} aria-label="Camera">{camOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}</button>}
          <button onClick={onEnd} disabled={ending} className="h-14 w-14 rounded-full bg-danger text-white flex items-center justify-center shadow-lg" aria-label="End call"><PhoneOff className="h-6 w-6" /></button>
        </div>
      </div>
    </div>
  );
}
