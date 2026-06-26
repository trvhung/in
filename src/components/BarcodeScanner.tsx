import { useEffect, useRef, useState, ChangeEvent } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [isScannerActive, setIsScannerActive] = useState<boolean>(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanContainerId = 'barcode-scanner-preview';

  // Find camera devices
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (cameras && cameras.length > 0) {
          setDevices(cameras);
          // Prefer back camera (contains 'back' or 'environment' or 'rear' in label)
          const backCam = cameras.find(
            (cam) =>
              cam.label.toLowerCase().includes('back') ||
              cam.label.toLowerCase().includes('environment') ||
              cam.label.toLowerCase().includes('rear') ||
              cam.label.toLowerCase().includes('sau')
          );
          const defaultCam = backCam || cameras[0];
          setActiveDeviceId(defaultCam.id);
        } else {
          setError('Không tìm thấy camera nào trên thiết bị.');
        }
      })
      .catch((err) => {
        console.error('Lỗi khi truy cập camera:', err);
        setError('Không thể truy cập camera. Vui lòng cấp quyền camera trong trình duyệt và thử lại.');
      });

    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((e) => console.error('Error stopping scanner during cleanup:', e));
      }
    };
  }, []);

  // Start/restart scanner when activeDeviceId changes
  useEffect(() => {
    if (!activeDeviceId) return;

    // Stop current scanner if running
    const restartScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (e) {
          console.error('Error stopping previous scanner:', e);
        }
      }

      const scanner = new Html5Qrcode(scanContainerId);
      scannerRef.current = scanner;
      setIsScannerActive(true);
      setError(null);

      try {
        await scanner.start(
          activeDeviceId,
          {
            fps: 12,
            // A wide and thin box for barcode scanning
            qrbox: (width, height) => {
              const boxWidth = Math.min(width * 0.8, 300);
              const boxHeight = Math.min(height * 0.35, 120);
              return { width: boxWidth, height: boxHeight };
            },
            aspectRatio: 1.777778, // 16:9 widescreen
          },
          (decodedText) => {
            // Success
            setSuccessMsg(`Quét thành công: ${decodedText}`);
            onScan(decodedText);
            // Flash feedback animation and wait briefly
            setTimeout(() => {
              setSuccessMsg(null);
            }, 1500);
          },
          (errorMessage) => {
            // Silent failure for non-scanned frames
          }
        );
      } catch (err: any) {
        console.error('Không thể bắt đầu quét camera:', err);
        setIsScannerActive(false);
        setError(`Lỗi khởi động camera: ${err.message || 'Thiết bị camera bận hoặc không hỗ trợ'}`);
      }
    };

    restartScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((e) => console.error('Cleanup stop error:', e));
      }
    };
  }, [activeDeviceId]);

  // Switch camera toggle
  const handleCameraChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setActiveDeviceId(e.target.value);
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600 animate-pulse" />
            <span className="font-semibold text-gray-800 text-base">Quét mã vạch camera sau</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Stage */}
        <div className="relative bg-black flex-1 flex flex-col justify-center items-center min-h-[250px] max-h-[400px] overflow-hidden">
          <div id={scanContainerId} className="w-full h-full object-cover" />

          {/* Scanner Overlay Box */}
          {isScannerActive && !error && !successMsg && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Outer dimmed screen mask */}
              <div className="absolute inset-0 bg-black/40"></div>
              
              {/* Clear scan aperture */}
              <div className="relative w-[300px] h-[120px] rounded-lg border-2 border-dashed border-blue-400 bg-transparent flex flex-col justify-between p-1 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Laser line simulator */}
                <div className="w-full h-0.5 bg-red-500 animate-[bounce_2s_infinite] shadow-[0_0_8px_#ef4444]" />
              </div>
              <p className="mt-4 text-xs text-white/90 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm z-10 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Căn chỉnh mã vạch vào khung nét đứt
              </p>
            </div>
          )}

          {/* Success Flash Feedback */}
          {successMsg && (
            <div className="absolute inset-0 bg-green-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in z-20">
              <CheckCircle className="w-16 h-16 text-green-400 mb-3 animate-bounce" />
              <p className="font-medium text-lg text-green-200">{successMsg}</p>
              <p className="text-xs text-green-300 mt-2">Đang tự động cập nhật số lượng tem...</p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center text-gray-200 p-6 text-center z-20">
              <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
              <p className="text-sm font-medium text-amber-400">{error}</p>
              <p className="text-xs text-gray-400 mt-2 max-w-sm">
                Hãy chắc chắn rằng trình duyệt được phép sử dụng Camera và không có ứng dụng nào khác đang sử dụng Camera.
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setActiveDeviceId((prev) => prev); // force reload
                }}
                className="mt-4 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Thử lại
              </button>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
          {devices.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Chọn thiết bị Camera:</label>
              <select
                value={activeDeviceId}
                onChange={handleCameraChange}
                className="w-full text-xs bg-white border border-gray-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
              >
                {devices.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Hỗ trợ: Code 128, EAN-13, EAN-8, UPC-A, Code-39</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 font-medium transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
