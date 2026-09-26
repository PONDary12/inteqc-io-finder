"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function WifiAccessModal({ isOpen, onClose, networkInfo }) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [copiedMain, setCopiedMain] = useState(false);
  const [copyMainHover, setCopyMainHover] = useState(false);
  const [closeBtnHover, setCloseBtnHover] = useState(false);
  const [footerCloseHover, setFooterCloseHover] = useState(false);
  const [openExternalHover, setOpenExternalHover] = useState(false);

  const modalBodyRef = useRef(null);

  const primaryUrl = networkInfo?.primaryUrl || "http://localhost:3000";
  const primaryIp = networkInfo?.primaryIp || "127.0.0.1";
  const port = networkInfo?.port || 3000;
  const ssid = networkInfo?.ssid || "inteqc.local";

  // Generate QR Code when modal opens or primaryUrl changes
  useEffect(() => {
    if (!isOpen || !primaryUrl) return;

    QRCode.toDataURL(primaryUrl, {
      width: 260,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [isOpen, primaryUrl]);

  // Close on Escape key and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyMain = async () => {
    try {
      await navigator.clipboard.writeText(primaryUrl);
      setCopiedMain(true);
      setTimeout(() => setCopiedMain(false), 2200);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.wifiIconCircle}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#cc1111"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <circle cx="12" cy="20" r="1.5" fill="#cc1111" />
              </svg>
            </div>
            <div>
              <div style={styles.titleRow}>
                <h3 style={styles.title}>เชื่อมต่อผ่าน Wi-Fi โรงงาน</h3>
                <span style={styles.readyBadge}>Ready</span>
              </div>
              <p style={styles.subtitle}>
                Factory Wi-Fi Access
              </p>
            </div>
          </div>
          <button
            style={{
              ...styles.closeBtn,
              ...(closeBtnHover ? styles.closeBtnHover : {}),
            }}
            onClick={onClose}
            onMouseEnter={() => setCloseBtnHover(true)}
            onMouseLeave={() => setCloseBtnHover(false)}
            aria-label="Close Modal"
            title="ปิดหน้าต่าง"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div ref={modalBodyRef} style={styles.modalBody}>
          {/* Notice Card: Instructions */}
          <div style={styles.instructionsCard}>
            <div style={styles.instructionsTitle}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#cc1111"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>วิธีเปิดใช้งานบนมือถือหรือแท็บเล็ต:</span>
            </div>
            <ol style={styles.instructionsList}>
              <li>
                เชื่อมต่ออุปกรณ์เข้ากับสัญญาณ Wi-Fi:{" "}
                <strong style={styles.highlightText}>{ssid}</strong>
              </li>
              <li>
                สแกน QR Code ด้านล่าง หรือกด{" "}
                <span style={styles.highlightText}>คัดลอกลิงก์</span>{" "}
                ไปเปิดใน Safari / Chrome
              </li>
            </ol>
          </div>

          {/* Main Card: QR Code and Wi-Fi Details */}
          <div style={styles.mainCard}>
            {/* Top row in card: SSID and Status */}
            <div style={styles.mainCardTopRow}>
              <div style={styles.ssidBadge}>
                <span style={styles.ssidSignalDot}>((•))</span>
                <span>SSID: {ssid}</span>
              </div>
              <div style={styles.onlineBadge}>
                <span style={styles.greenPulseDot}></span>
                <span>Wi-Fi Online</span>
              </div>
            </div>

            {/* QR Code Container */}
            <div style={styles.qrWrapper}>
              <div style={styles.qrContainer}>
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="INTEQC I/O Finder Factory Wi-Fi QR Code"
                    style={styles.qrImage}
                  />
                ) : (
                  <div style={styles.qrPlaceholder}>
                    <div style={styles.spinner}></div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      กำลังสร้าง QR Code...
                    </span>
                  </div>
                )}
                <div style={styles.qrFootnote}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      display: "inline-block",
                      verticalAlign: "middle",
                      marginRight: 4,
                    }}
                  >
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  สแกนด้วยกล้องมือถือ / iPad
                </div>
              </div>
            </div>

            {/* URL Section */}
            <div style={styles.urlSection}>
              <div style={styles.urlLabel}>ที่อยู่ URL สำหรับเปิดบนบราวเซอร์:</div>
              <div style={styles.urlBox}>
                <span style={styles.urlText}>{primaryUrl}</span>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionButtonsRow}>
                <button
                  style={{
                    ...styles.copyMainBtn,
                    backgroundColor: copiedMain
                      ? "#059669"
                      : copyMainHover
                      ? "#b00f0f"
                      : "#cc1111",
                    boxShadow: copiedMain
                      ? "0 4px 12px rgba(5, 150, 105, 0.25)"
                      : copyMainHover
                      ? "0 4px 14px rgba(204, 17, 17, 0.35)"
                      : "0 4px 12px rgba(204, 17, 17, 0.25)",
                  }}
                  onClick={handleCopyMain}
                  onMouseEnter={() => setCopyMainHover(true)}
                  onMouseLeave={() => setCopyMainHover(false)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {copiedMain ? (
                      <polyline points="20 6 9 17 4 12" />
                    ) : (
                      <>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </>
                    )}
                  </svg>
                  <span>
                    {copiedMain ? "คัดลอกเรียบร้อยแล้ว!" : "คัดลอกลิงก์ Wi-Fi"}
                  </span>
                </button>

                <a
                  href={primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...styles.openExternalBtn,
                    ...(openExternalHover ? styles.openExternalBtnHover : {}),
                  }}
                  onMouseEnter={() => setOpenExternalHover(true)}
                  onMouseLeave={() => setOpenExternalHover(false)}
                  title="เปิดในแท็บใหม่"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>

              {/* Details Footer */}
              <div style={styles.ipPortFooter}>
                IP: <span style={styles.monoText}>{primaryIp}</span> • Port:{" "}
                <span style={styles.monoText}>{port}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Modal Bottom Bar */}
        <div style={styles.modalFooter}>
          <div style={styles.firewallStatus}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <span>
              Windows Firewall: Inbound Port {port} (
              {networkInfo?.firewallStatus || "พร้อมใช้งาน"})
            </span>
          </div>
          <button
            style={{
              ...styles.footerCloseBtn,
              ...(footerCloseHover ? styles.footerCloseBtnHover : {}),
            }}
            onClick={onClose}
            onMouseEnter={() => setFooterCloseHover(true)}
            onMouseLeave={() => setFooterCloseHover(false)}
            type="button"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
    boxSizing: "border-box",
    overflow: "hidden",
    animation: "fadeIn 0.2s ease-out",
  },
  modal: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "450px",
    maxHeight: "min(92dvh, 760px)",
    display: "flex",
    flexDirection: "column",
    boxShadow:
      "0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 35px rgba(204, 17, 17, 0.08)",
    overflow: "hidden",
    color: "#0f172a",
    fontFamily: "inherit",
    boxSizing: "border-box",
    margin: "auto",
    position: "relative",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "14px 18px 12px 18px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  wifiIconCircle: {
    width: "38px",
    height: "38px",
    borderRadius: "9px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  title: {
    fontSize: "15.5px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  readyBadge: {
    fontSize: "10.5px",
    fontWeight: "700",
    backgroundColor: "#fef2f2",
    color: "#cc1111",
    border: "1px solid #fecaca",
    padding: "2px 7px",
    borderRadius: "999px",
  },
  subtitle: {
    fontSize: "11.5px",
    color: "#64748b",
    margin: "2px 0 0 0",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.15s, background 0.15s",
  },
  closeBtnHover: {
    backgroundColor: "#fef2f2",
    color: "#cc1111",
  },
  modalBody: {
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    touchAction: "pan-y",
    scrollbarWidth: "thin",
    scrollbarColor: "#cbd5e1 transparent",
    padding: "14px 18px 16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxSizing: "border-box",
  },
  instructionsCard: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fee2e2",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "12px",
  },
  instructionsTitle: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#cc1111",
    fontWeight: "700",
    marginBottom: "4px",
  },
  instructionsList: {
    margin: 0,
    paddingLeft: "18px",
    color: "#334155",
    lineHeight: "1.55",
    fontSize: "12px",
  },
  highlightText: {
    color: "#b91c1c",
    fontWeight: "700",
    fontFamily: "monospace",
  },
  mainCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
  },
  mainCardTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ssidBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "999px",
    padding: "3px 10px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#cc1111",
    fontFamily: "monospace",
  },
  ssidSignalDot: {
    fontSize: "11px",
  },
  onlineBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#10b981",
  },
  greenPulseDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    boxShadow: "0 0 6px rgba(16, 185, 129, 0.6)",
    display: "inline-block",
  },
  qrWrapper: {
    display: "flex",
    justifyContent: "center",
    margin: "2px 0",
  },
  qrContainer: {
    backgroundColor: "#ffffff",
    padding: "12px 12px 8px 12px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "fit-content",
  },
  qrImage: {
    width: "185px",
    height: "185px",
    display: "block",
  },
  qrPlaceholder: {
    width: "185px",
    height: "185px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  spinner: {
    width: "28px",
    height: "28px",
    border: "3px solid #fecaca",
    borderTopColor: "#cc1111",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  qrFootnote: {
    marginTop: "6px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },
  urlSection: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  urlLabel: {
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#64748b",
  },
  urlBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "9px 12px",
    textAlign: "center",
  },
  urlText: {
    fontFamily: "monospace",
    fontSize: "14px",
    fontWeight: "700",
    color: "#cc1111",
    letterSpacing: "0.02em",
    wordBreak: "break-all",
  },
  actionButtonsRow: {
    display: "flex",
    gap: "8px",
    marginTop: "1px",
  },
  copyMainBtn: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    cursor: "pointer",
    transition: "background 0.2s, transform 0.1s, box-shadow 0.2s",
  },
  openExternalBtn: {
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#475569",
    padding: "0 13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    cursor: "pointer",
    transition: "background 0.2s, color 0.2s, border-color 0.2s",
  },
  openExternalBtnHover: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    color: "#cc1111",
  },
  ipPortFooter: {
    textAlign: "center",
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
  },
  monoText: {
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#0f172a",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "11px 18px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    flexShrink: 0,
    boxSizing: "border-box",
  },
  firewallStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11.5px",
    color: "#64748b",
  },
  footerCloseBtn: {
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    color: "#334155",
    borderRadius: "7px",
    padding: "5px 14px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  footerCloseBtnHover: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    color: "#cc1111",
  },
};
