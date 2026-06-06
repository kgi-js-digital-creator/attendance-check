import { useState, useEffect, useRef } from "react";
import type * as React from "react";
import {
  CircleAlert,
  PencilLine,
  ScanLine,
  SquareArrowRightEnter,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import jsQR from "jsqr";
import sendGAS from "./components/sendGAS";
import beepSound from "./assets/Cash_Register-Beep01-1.mp3";

function pushData(id: string, name: string) {
  console.log("Pushing data:", { id, name });
}

interface GasResult {
  show: boolean;
  isLoading?: boolean;
  success?: boolean;
  isAlready?: boolean;
  registeredTime?: string;
  user?: {
    id?: string | number;
    name?: string;
  };
}

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const gasParam = urlParams.get("gas");
  const spreadsheetParam = urlParams.get("spreadsheet");
  const teamParam = urlParams.get("team");
  const hasParams = !!(gasParam && spreadsheetParam);

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [gasResult, setGasResult] = useState<GasResult>({ show: false });
  const [currentTime, setCurrentTime] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleQRScan = async (qrData: string) => {
    const parts = qrData.split("_");
    if (parts.length < 2) {
      isProcessingRef.current = false;
      return;
    }
    const qrId = parts[0];
    const qrName = parts.slice(1).join("_");
    if (!qrId || !qrName) {
      isProcessingRef.current = false;
      return;
    }

    const audio = new Audio(beepSound);
    audio.play().catch((err) => {
      console.error("Failed to play scan sound:", err);
    });

    pushData(qrId, qrName);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setGasResult({
      show: true,
      isLoading: true,
    });

    const result = await sendGAS(qrId, qrName);

    setGasResult({
      show: true,
      success: result.success,
      isAlready: result.isAlready,
      registeredTime: result.registeredTime,
      user: result.user,
    });

    const newTimerId = window.setTimeout(() => {
      setGasResult({ show: false });
    }, 10000);
    timerRef.current = newTimerId;

    window.setTimeout(() => {
      isProcessingRef.current = false;
    }, 3000);
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    pushData(id, name);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    isProcessingRef.current = true;

    setGasResult({
      show: true,
      isLoading: true,
    });

    const result = await sendGAS(id, name);

    setGasResult({
      show: true,
      success: result.success,
      isAlready: result.isAlready,
      registeredTime: result.registeredTime,
      user: result.user,
    });

    const newTimerId = window.setTimeout(() => {
      setGasResult({ show: false });
    }, 8000);
    timerRef.current = newTimerId;

    setId("");
    setName("");

    window.setTimeout(() => {
      isProcessingRef.current = false;
    }, 3050);
  };

  useEffect(() => {
    if (!hasParams) return;

    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not supported in this browser.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play().catch((err) => {
            console.error("Error playing video:", err);
          });

          videoRef.current.addEventListener("loadedmetadata", () => {
            tick();
          });
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    };

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const tick = () => {
      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        if (context) {
          context.drawImage(
            videoRef.current,
            0,
            0,
            canvas.width,
            canvas.height,
          );
          const imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data && !isProcessingRef.current) {
            isProcessingRef.current = true;
            handleQRScan(code.data);
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [hasParams]);

  if (!hasParams) {
    return (
      <div className="font-rounded flex h-dvh w-full flex-col items-center justify-center bg-taupe-100 p-6 text-taupe-800 antialiased select-none">
        <div className="flex max-w-lg flex-col items-center rounded-3xl border border-taupe-200 bg-white p-8 text-center shadow-lg md:p-12">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <CircleAlert size="48" />
          </div>
          <div className="mb-3 text-3xl font-bold tracking-tight text-taupe-800">
            設定が不足しています
          </div>
          <div className="mb-6 text-lg leading-relaxed text-taupe-500">
            出席確認システムを起動するには、URLパラメータに{" "}
            <code className="rounded bg-taupe-100 px-1.5 py-0.5 font-mono text-sm text-rose-600">
              gas
            </code>{" "}
            と{" "}
            <code className="rounded bg-taupe-100 px-1.5 py-0.5 font-mono text-sm text-rose-600">
              spreadsheet
            </code>{" "}
            の指定が必要です（任意で{" "}
            <code className="rounded bg-taupe-100 px-1.5 py-0.5 font-mono text-sm text-rose-600">
              team
            </code>{" "}
            の指定も可能です）。
          </div>
          <div className="w-full rounded-2xl border border-taupe-200 bg-taupe-50 p-4 text-left font-mono text-sm text-taupe-600">
            <div className="mb-1.5 font-bold text-taupe-800">
              【URLの指定例】
            </div>
            <div className="break-all whitespace-pre-wrap select-all">
              {window.location.origin}
              /attendance-check/?team=○○班&amp;gas=https://script.google.com/...&amp;spreadsheet=https://docs.google.com/...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="font-rounded relative m-0 flex h-dvh w-full flex-col overflow-y-auto bg-taupe-100 p-0 text-taupe-800 antialiased select-none lg:overflow-hidden">
        <header className="flex min-h-24 w-full shrink-0 flex-row items-center justify-between border-b border-taupe-300 bg-taupe-50 px-4 shadow-sm">
          <div className="flex gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-taupe-600 text-taupe-200">
              <UserRoundCheck size="48" className="ml-1" />
            </div>
            <div className="flex flex-col">
              <div className="flex flex-row text-4xl font-medium">
                デジクリ 出席確認システム
              </div>
              <div className="text-xl font-medium">Attendance Check System</div>
            </div>
            .
          </div>
          <div className="flex flex-col items-end justify-center font-mono">
            <div className="text-lg font-medium text-taupe-500 md:text-xl">
              {currentTime.getFullYear()}/
              {String(currentTime.getMonth() + 1).padStart(2, "0")}/
              {String(currentTime.getDate()).padStart(2, "0")}(
              {["日", "月", "火", "水", "木", "金", "土"][currentTime.getDay()]}
              )
            </div>
            <div className="text-4xl font-bold tracking-wider text-taupe-800 md:text-5xl">
              {currentTime.toTimeString().split(" ")[0]}
            </div>
          </div>
        </header>
        <main className="flex min-h-0 w-full max-w-none flex-1 flex-col gap-4 p-4 md:p-6 lg:h-[calc(100vh-4rem)]">
          <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {/* 縦長１ */}
            <div className="flex flex-col rounded-2xl border border-taupe-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md md:p-6 lg:h-full lg:min-h-0">
              <div className="flex shrink-0 flex-row items-center">
                <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-taupe-400/50">
                  <PencilLine size="40" className="mr-0.5 mb-0.5" />
                </div>
                <div className="flex flex-col pl-3 font-medium">
                  <div className="text-3xl">手動でログイン</div>
                  <div className="text-xl text-taupe-500">
                    QRコードが使えない場合はこちら
                  </div>
                </div>
              </div>
              <form
                id="manualForm"
                onSubmit={handleSubmit}
                className="my-2 flex flex-1 flex-col justify-center gap-4"
              >
                <div className="flex flex-col">
                  <div className="p-1 text-3xl font-medium">ID</div>
                  <input
                    type="text"
                    name="id"
                    value={id}
                    onChange={(event) => setId(event.target.value)}
                    autoComplete="off"
                    required
                    className="h-14 w-full rounded-xl border-2 border-taupe-400/50 bg-taupe-100 px-4 text-3xl transition-all duration-300 focus:border-taupe-400"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="p-1 text-3xl font-medium">名前</div>
                  <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="off"
                    required
                    className="duraution-300 h-14 w-full rounded-xl border-2 border-taupe-400/50 bg-taupe-100 px-4 text-3xl transition-all focus:border-taupe-400"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-auto flex h-18 w-full shrink-0 flex-row items-center justify-center gap-4 rounded-2xl bg-taupe-600 text-taupe-50 transition duration-75 active:scale-95 active:transform"
                >
                  <SquareArrowRightEnter size="38" className="text-taupe-50" />
                  <div className="text-4xl font-medium">出席データを送信</div>
                </button>
              </form>
              <div className="flex shrink-0 flex-col justify-end gap-2">
                <div className="h-0.5 w-full rounded-2xl bg-taupe-300" />
                <div className="flex flex-row items-center gap-2 text-taupe-500">
                  <CircleAlert size={24} className="text-taupe-400" />
                  IDと名前は正確に入力してください。
                </div>
              </div>
            </div>

            {/* 縦長２ */}
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-taupe-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md md:p-6 lg:h-full lg:min-h-0">
              <div className="flex shrink-0 flex-row items-center">
                <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-taupe-400/50">
                  <ScanLine size="40" className="" />
                </div>
                <div className="flex flex-col pl-3 font-medium">
                  <div className="text-3xl">QRコードでログイン</div>
                  <div className="text-xl text-taupe-500">
                    カメラにQRコードをかざしてください
                  </div>
                </div>
              </div>
              <div className="relative mt-3 min-h-0 w-full flex-1 overflow-hidden rounded-xl bg-taupe-950 shadow-sm">
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  playsInline
                />
                {/* Overlay visual scanner effect */}
                <div className="pointer-events-none absolute inset-0 m-4 flex items-center justify-center rounded-lg border-2 border-dashed border-taupe-300/30">
                  <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-taupe-100" />
                  <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-taupe-100" />
                  <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-taupe-100" />
                  <div className="absolute right-0 bottom-0 h-4 w-4 border-r-2 border-b-2 border-taupe-100" />
                </div>
              </div>
              <div className="mt-2 flex shrink-0 items-center justify-center gap-4 text-xl font-medium text-taupe-500">
                <div className="h-3 w-1 animate-ping rounded-full bg-emerald-500" />
                <span>QRコードスキャン待機中...</span>
              </div>
            </div>
          </div>
          {/* 横長１ */}
          <div className="flex min-h-28 shrink-0 flex-col items-center justify-between gap-4 rounded-2xl border border-taupe-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md md:flex-row md:p-6">
            <div className="flex w-full flex-row items-center gap-8 md:w-auto md:flex-1">
              {gasResult.show ? (
                gasResult.isLoading ? (
                  <>
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-taupe-100 text-taupe-600 transition-all duration-300">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-taupe-300 border-t-taupe-600" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-3xl font-medium text-taupe-800 md:text-4xl">
                        照合中...
                      </div>
                      <div className="text-sm font-medium text-taupe-500 md:text-base">
                        出席データを送信しています。しばらくお待ちください。
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {gasResult.success ? (
                      gasResult.isAlready ? (
                        <>
                          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 transition-all duration-300">
                            <UserRound size="64" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-row gap-4 text-4xl font-medium text-taupe-800 md:text-5xl">
                              <div>{gasResult.user?.id || "不明なID"}</div>
                              <div>{gasResult.user?.name || "不明な名前"}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-lg font-medium text-amber-600">
                              <span>既にログインしています</span>
                              {gasResult.registeredTime && (
                                <span className="text-sm font-normal text-taupe-500">
                                  ({gasResult.registeredTime})
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-all duration-300">
                            <UserRoundCheck size="64" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-row gap-4 text-4xl font-medium text-taupe-800 md:text-5xl">
                              <div>{gasResult.user?.id || "不明なID"}</div>
                              <div>{gasResult.user?.name || "不明な名前"}</div>
                            </div>
                            <div className="text-lg font-medium text-emerald-600">
                              出席を受け付けました
                            </div>
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 transition-all duration-300">
                          <CircleAlert size="64" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="text-3xl font-medium text-rose-600 md:text-5xl">
                            エラーが発生しました
                          </div>
                          <div className="text-sm font-medium text-taupe-500 md:text-base">
                            データの送信に失敗しました。時間をおいて再度お試しください。
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )
              ) : (
                <>
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-taupe-100 text-taupe-400 transition-all duration-300">
                    <UserRound size="64" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-4xl font-medium text-taupe-400 md:text-5xl">
                      待機中
                    </div>
                    <div className="text-sm font-medium text-taupe-400 md:text-base">
                      送信するとここに表示されます
                    </div>
                  </div>
                </>
              )}
            </div>
            {teamParam && (
              <div className="mr-4 flex items-center justify-center rounded-2xl">
                <span className="text-2xl font-bold text-taupe-700 md:text-5xl">
                  {teamParam}
                </span>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default App;
