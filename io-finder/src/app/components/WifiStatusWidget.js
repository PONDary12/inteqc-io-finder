"use client";

import { useState } from "react";

export default function WifiStatusWidget({ networkInfo, onOpenModal }) {
  const [btnHover, setBtnHover] = useState(false);
  const ssid = networkInfo?.ssid || "inteqc.local";
  const primaryIp = networkInfo?.primaryIp || "127.0.0.1";
  const port = networkInfo?.port || 3000;

  // Format IP display, e.g. 192.168.104.85:3000
  const ipPortString = `${primaryIp}:${port}`;

  return (
    <div style={styles.widgetContainer}>
      {/* Status indicator dot */}
      <span style={styles.statusDot} title="Wi-Fi Online"></span>

      {/* Wi-Fi Icon & Label */}
      <div style={styles.labelGroup}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#cc1111"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1.5" fill="#cc1111" />
        </svg>
        <span style={styles.widgetTitle}>
          <span className="wifi-widget-title-full">FACTORY WI-FI</span>
          <span className="wifi-widget-title-short">WI-FI</span>
        </span>
      </div>

      {/* SSID Chip */}
      <span style={styles.ssidChip} title={`Wi-Fi SSID: ${ssid}`}>
        {ssid}
      </span>

      {/* IP Address (Desktop only) */}
      <div className="wifi-widget-ip" style={styles.ipAddress} title={ipPortString}>
        {ipPortString}
      </div>

      {/* Scan QR Button */}
      <button
        style={{
          ...styles.scanQrBtn,
          ...(btnHover ? styles.scanQrBtnHover : {}),
        }}
        onClick={onOpenModal}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        type="button"
        title="เปิด QR Code สำหรับสแกนเข้าใช้งานผ่าน Wi-Fi"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <line x1="14" y1="14" x2="14" y2="14.01" />
          <line x1="14" y1="20" x2="14" y2="20.01" />
          <line x1="20" y1="14" x2="20" y2="14.01" />
          <line x1="20" y1="20" x2="20" y2="20.01" />
        </svg>
        <span>Scan QR</span>
      </button>
    </div>
  );
}

const styles = {
  widgetContainer: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "5px 10px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05), 0 0 12px rgba(204, 17, 17, 0.04)",
    fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
    transition: "border-color 0.2s, box-shadow 0.2s",
    flexWrap: "nowrap",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    maxWidth: "100%",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    boxShadow: "0 0 6px rgba(16, 185, 129, 0.5)",
    flexShrink: 0,
  },
  labelGroup: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    flexShrink: 0,
  },
  widgetTitle: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "0.06em",
  },
  ssidChip: {
    fontSize: "11px",
    fontWeight: "700",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#cc1111",
    padding: "2px 7px",
    borderRadius: "5px",
    letterSpacing: "0.01em",
    flexShrink: 0,
  },
  ipAddress: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#334155",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "2px 7px",
    borderRadius: "5px",
    maxWidth: "160px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    letterSpacing: "0.01em",
    flexShrink: 1,
  },
  scanQrBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#cc1111",
    border: "1px solid #b00f0f",
    color: "#ffffff",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11.5px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(204, 17, 17, 0.22)",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  scanQrBtnHover: {
    backgroundColor: "#b00f0f",
    boxShadow: "0 4px 10px rgba(204, 17, 17, 0.35)",
    transform: "translateY(-1px)",
  },
};
