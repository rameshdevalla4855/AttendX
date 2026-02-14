import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

export default function QrScanner({ onScan, onError }) {
    const scannerRef = useRef(null);
    const lastScanRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    useEffect(() => {
        const elementId = "reader";
        let html5QrCode;
        let isMounted = true;

        const initScanner = async () => {
            // Safety: Ensure pure clean slate
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.getState() !== Html5QrcodeScannerState.NOT_STARTED) {
                        await scannerRef.current.stop();
                    }
                    await scannerRef.current.clear();
                } catch (e) {
                    console.warn("Cleanup error before init:", e);
                }
                scannerRef.current = null;
            }

            // Create new instance with Barcode Support
            try {
                html5QrCode = new Html5Qrcode(elementId, {
                    verbose: false,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.QR_CODE,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8
                    ]
                });
                scannerRef.current = html5QrCode;
            } catch (err) {
                console.error("New Instance Error", err);
                return;
            }

            const config = {
                fps: 24, // Higher frequency for precision
                qrbox: { width: 450, height: 150 }, // Optimized for linear barcodes
                // DISABLE native detector if it's causing misreads
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: false
                }
            };

            if (!isMounted) return;

            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        if (!isMounted) return;
                        // Debounce
                        if (decodedText !== lastScanRef.current) {
                            lastScanRef.current = decodedText;
                            onScan(decodedText);
                            setTimeout(() => { lastScanRef.current = null; }, 3000);

                            // Visual Feedback
                            const reader = document.getElementById(elementId);
                            if (reader) {
                                reader.style.border = "4px solid #10b981";
                                setTimeout(() => reader.style.border = "none", 500);
                            }
                        }
                    },
                    (errorMessage) => {
                        // ignore
                    }
                );
            } catch (err) {
                if (isMounted) {
                    console.error("Failed to start scanner:", err);
                    if (onError && err?.name !== "NotAllowedError") onError(err);
                }
            }
        };

        // Delay init to allow previous cleanup to settle
        const timer = setTimeout(initScanner, 300);

        return () => {
            isMounted = false; // Kill any pending logic
            clearTimeout(timer);

            // Cleanup logic
            if (scannerRef.current) {
                const state = scannerRef.current.getState();
                if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                    scannerRef.current.stop()
                        .then(() => scannerRef.current.clear())
                        .catch(err => console.warn("Stop failed during unmount:", err));
                } else {
                    scannerRef.current.clear().catch(e => console.warn("Clear failed", e));
                }
            }
        };
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!scannerRef.current) return;

        setIsProcessingFile(true);
        try {
            const decodedText = await scannerRef.current.scanFileV2(file, true);
            console.log("File Scan Result:", decodedText);
            if (decodedText) {
                onScan(decodedText);
            }
        } catch (err) {
            console.error("File scan error:", err);
            alert("Could not read barcode from image. Please ensure good lighting and clear focus.");
        } finally {
            setIsProcessingFile(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="relative w-full h-full bg-black group">
            <div id="reader" className="w-full h-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover"></div>

            {/* Upload Overlay Button */}
            <div className="absolute bottom-4 right-4 z-20">
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />
                <button
                    onClick={() => fileInputRef.current.click()}
                    disabled={isProcessingFile}
                    className="p-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white hover:bg-white/30 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    title="Scan from Image"
                >
                    {isProcessingFile ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
                </button>
            </div>
        </div>
    );
}
