
import { useEffect, useState } from "react";
import supabase from "../lib/supabase";

type LiveSession = {
  id: string;
  astrologer_id: string;
  title: string;
  status: "live" | "ended";
  started_at: string;
};

export default function GoLive() {
  const [title, setTitle] = useState("");
  const [userId, setUserId] = useState("");
  const [mySession, setMySession] = useState<LiveSession | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshSessions() {
    const { data, error } = await supabase
      .from("rahutalk_live_sessions")
      .select("*")
      .eq("status", "live")
      .order("started_at", { ascending: false });

    if (!error) setSessions(data ?? []);
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const id = data.user?.id ?? "";
      setUserId(id);

      if (id) {
        const { data: mine } = await supabase
          .from("rahutalk_live_sessions")
          .select("*")
          .eq("astrologer_id", id)
          .eq("status", "live")
          .maybeSingle();

        if (mounted) setMySession(mine);
      }

      await refreshSessions();
    }

    void load();

    const channel = supabase
      .channel("rahutalk-live-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rahutalk_live_sessions",
        },
        () => {
          void refreshSessions();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  async function startLive() {
    if (!userId || !title.trim()) {
      setMessage("Login karein aur live ka title enter karein.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { data, error } = await supabase
      .from("rahutalk_live_sessions")
      .insert({
        astrologer_id: userId,
        title: title.trim(),
        status: "live",
      })
      .select("*")
      .single();

    setBusy(false);

    if (error) {
      setMessage("Live session start nahi hua: " + error.message);
      return;
    }

    setMySession(data);
    setTitle("");
    setMessage("Live session create ho gaya. Video streaming abhi connect karni hai.");
    await refreshSessions();
  }

  async function endLive() {
    if (!mySession) return;

    setBusy(true);

    const { error } = await supabase
      .from("rahutalk_live_sessions")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .eq("id", mySession.id);

    setBusy(false);

    if (error) {
      setMessage("Live end nahi hua: " + error.message);
      return;
    }

    setMySession(null);
    setMessage("Live session end ho gaya.");
    await refreshSessions();
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <div className="rounded-2xl border border-purple-300/20 bg-slate-950 p-5 text-white">
        <h2 className="mb-4 text-2xl font-bold">Rahu Talk Live</h2>

        {mySession ? (
          <>
            <p className="mb-3">
              🔴 LIVE: {mySession.title}
            </p>
            <button
              onClick={endLive}
              disabled={busy}
              className="rounded-xl bg-red-600 px-5 py-3 font-semibold disabled:opacity-50"
            >
              {busy ? "Please wait..." : "End Live"}
            </button>
          </>
        ) : (
          <>
            <label htmlFor="live-title" className="mb-2 block">
              Live session ka title
            </label>
            <input
              id="live-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Aaj ka Rashifal"
              className="mb-4 w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-white"
            />
            <button
              onClick={startLive}
              disabled={busy || !userId || !title.trim()}
              className="rounded-xl bg-purple-600 px-5 py-3 font-semibold disabled:opacity-50"
            >
              {busy ? "Please wait..." : "🔴 Go Live"}
            </button>
          </>
        )}

        {message && (
          <p role="status" className="mt-4 break-words text-sm">
            {message}
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-xl font-bold">
          Astrologers Live Now
        </h3>

        {sessions.length === 0 ? (
          <p className="text-slate-500">Abhi koi live session nahi hai.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sessions.map((session) => (
              <article
                key={session.id}
                className="rounded-xl border p-4"
              >
                <p className="mb-2 text-sm font-semibold text-red-600">
                  ● LIVE
                </p>
                <h4 className="font-bold">{session.title}</h4>
                <p className="mt-1 text-sm text-slate-500">
                  Started{" "}
                  {new Date(session.started_at).toLocaleTimeString()}
                </p>
                <p className="mt-3 text-sm">
                  Video streaming integration required
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
