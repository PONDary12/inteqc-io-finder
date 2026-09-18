import { NextResponse } from 'next/server';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const hostname = os.hostname() || 'localhost';
    const port = process.env.PORT || '3000';
    const envSsid = process.env.NEXT_PUBLIC_WIFI_SSID || process.env.WIFI_SSID || 'inteqc.local';
    const envLocation = process.env.NEXT_PUBLIC_PLANT_LOCATION || process.env.PLANT_LOCATION || 'Liquid Coating T3';
    const envOverrideIp = process.env.NEXT_PUBLIC_SERVER_IP || process.env.SERVER_IP || '';

    const detected = [];

    // Scan all network interfaces
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        // Only accept non-internal IPv4
        if (addr.family === 'IPv4' && !addr.internal) {
          const isWifi = /wi-?fi|wlan|wireless|802\.11/i.test(name);
          const isScada = /scada|plc/i.test(name);
          const isEthernet = /ethernet|eth|lan|local area/i.test(name);

          let type = 'other';
          let displayName = name;

          if (isWifi) {
            type = 'wifi';
            displayName = `Wi-Fi (${name})`;
          } else if (isScada) {
            type = 'scada';
            displayName = `SCADA LAN (${name})`;
          } else if (isEthernet) {
            type = 'lan';
            displayName = `Ethernet (${name})`;
          }

          detected.push({
            name: displayName,
            rawName: name,
            ip: addr.address,
            url: `http://${addr.address}:${port}`,
            type,
            isWifi,
          });
        }
      }
    }

    // Sort detected interfaces: Wi-Fi first, then Ethernet/SCADA, then others
    detected.sort((a, b) => {
      if (a.isWifi && !b.isWifi) return -1;
      if (!a.isWifi && b.isWifi) return 1;
      return a.name.localeCompare(b.name);
    });

    // Primary IP: use override if specified, else Wi-Fi, else first detected, else 127.0.0.1
    let primaryIp = '127.0.0.1';
    let isWifiDetected = false;

    if (envOverrideIp) {
      primaryIp = envOverrideIp;
      isWifiDetected = true;
    } else if (detected.length > 0) {
      const wifiMatch = detected.find(d => d.isWifi);
      if (wifiMatch) {
        primaryIp = wifiMatch.ip;
        isWifiDetected = true;
      } else {
        primaryIp = detected[0].ip;
        isWifiDetected = true; // Connected via plant LAN / AP router
      }
    }

    const primaryUrl = `http://${primaryIp}:${port}`;

    // Other interfaces list for the accordion
    const otherInterfaces = [];

    // 1. Computer Hostname
    otherInterfaces.push({
      name: `Computer Hostname (${hostname})`,
      ip: hostname,
      url: `http://${hostname}:${port}`,
      type: 'hostname',
    });

    // 2. Add detected adapters other than primary
    for (const iface of detected) {
      if (iface.ip !== primaryIp) {
        otherInterfaces.push({
          name: iface.name,
          ip: iface.ip,
          url: iface.url,
          type: iface.type,
        });
      }
    }

    // 3. Localhost
    otherInterfaces.push({
      name: 'Localhost (This PC only)',
      ip: '127.0.0.1',
      url: `http://localhost:${port}`,
      type: 'local',
    });

    return NextResponse.json({
      ssid: envSsid,
      locationName: envLocation,
      port: Number(port),
      primaryIp,
      primaryUrl,
      isWifiDetected,
      interfaces: otherInterfaces,
      firewallStatus: 'พร้อมใช้งาน',
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (err) {
    console.error('Failed to get network info:', err);
    return NextResponse.json({
      ssid: 'inteqc.local',
      locationName: 'Liquid Coating T3',
      port: 3000,
      primaryIp: '127.0.0.1',
      primaryUrl: 'http://localhost:3000',
      isWifiDetected: false,
      interfaces: [],
      firewallStatus: 'พร้อมใช้งาน',
    }, { status: 500 });
  }
}
