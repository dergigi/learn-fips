import { useMemo, useState } from "react";

/**
 * InstallPicker: a tabbed OS selector for getting a FIPS node running.
 *
 * Command text is copied verbatim from the FIPS README's install section
 * (https://github.com/jmcorgan/fips#installation). The bootstrap peer is
 * already in the default config shipped by the Debian and macOS packages,
 * so the "join the test mesh" step is usually a no-op. The tarball flow
 * calls it out separately because that config path is user-managed.
 */

type OsId = "debian" | "macos" | "linux-tarball" | "windows" | "source";

interface Snippet {
  label: string;
  code: string;
  notes?: string;
}

interface Guide {
  tab: string;
  install: Snippet[];
  start: Snippet[];
  /** Whether the shipped default config already has the test peer. */
  testPeerPreconfigured: boolean;
}

const TEST_PEER_NPUB = "npub1qmc3cvfz0yu2hx96nq3gp55zdan2qclealn7xshgr448d3nh6lks7zel98";
const TEST_PEER_UDP = "217.77.8.91:2121";

const TEST_PEER_YAML = `peers:
  - npub: "${TEST_PEER_NPUB}"
    alias: "fips-test-node"
    addresses:
      - transport: udp
        addr: "${TEST_PEER_UDP}"
    connect_policy: auto_connect`;

const GUIDES: Record<OsId, Guide> = {
  debian: {
    tab: "Debian / Ubuntu",
    install: [
      {
        label: "Build and install the .deb",
        code: `git clone https://github.com/jmcorgan/fips.git
cd fips
cargo install cargo-deb
cargo deb
sudo dpkg -i target/debian/fips_*.deb`,
        notes: "Requires Rust 1.85+. The package ships systemd units and the default peer config.",
      },
      {
        label: "Let your user talk to the daemon",
        code: `sudo usermod -aG fips $USER
# log out and back in for the group change to take effect`,
      },
    ],
    start: [
      {
        label: "Start the service",
        code: `sudo systemctl start fips
sudo journalctl -u fips -f`,
      },
    ],
    testPeerPreconfigured: true,
  },
  macos: {
    tab: "macOS",
    install: [
      {
        label: "Build and install the .pkg",
        code: `git clone https://github.com/jmcorgan/fips.git
cd fips
./packaging/macos/build-pkg.sh
sudo installer -pkg deploy/fips-*-macos-*.pkg -target /`,
        notes: "Installer writes /etc/resolver/fips so .fips names resolve through the daemon.",
      },
    ],
    start: [
      {
        label: "Load the launchd daemon",
        code: `sudo launchctl load -w /Library/LaunchDaemons/com.fips.daemon.plist
sudo tail -f /usr/local/var/log/fips/fips.log`,
      },
    ],
    testPeerPreconfigured: true,
  },
  "linux-tarball": {
    tab: "Linux (tarball)",
    install: [
      {
        label: "Build the systemd tarball and run the installer",
        code: `git clone https://github.com/jmcorgan/fips.git
cd fips
./packaging/systemd/build-tarball.sh
tar xzf deploy/fips-*-linux-*.tar.gz
cd fips-*-linux-*/
sudo ./install.sh`,
      },
    ],
    start: [
      {
        label: "Start and follow logs",
        code: `sudo systemctl start fips
sudo journalctl -u fips -f`,
      },
    ],
    testPeerPreconfigured: false,
  },
  windows: {
    tab: "Windows",
    install: [
      {
        label: "Build without BLE",
        code: `git clone https://github.com/jmcorgan/fips.git
cd fips
cargo build --release --no-default-features --features tui`,
        notes: "Place wintun.dll next to fips.exe. TUN creation needs Administrator.",
      },
      {
        label: "Install as a service (elevated PowerShell)",
        code: `.\\target\\release\\fips.exe --install-service`,
      },
    ],
    start: [
      {
        label: "Start the service",
        code: `sc start fips`,
      },
    ],
    testPeerPreconfigured: false,
  },
  source: {
    tab: "From source (any platform)",
    install: [
      {
        label: "Build and run directly",
        code: `git clone https://github.com/jmcorgan/fips.git
cd fips
cargo build --release`,
      },
    ],
    start: [
      {
        label: "Run in the foreground",
        code: `./target/release/fips -c fips.yaml`,
        notes: "You manage the config file yourself. Paste the peer snippet below into fips.yaml.",
      },
    ],
    testPeerPreconfigured: false,
  },
};

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        // Clipboard can fail in insecure contexts. Leave the UI unchanged.
      });
  };

  return (
    <div className="relative group">
      <pre className="rounded border border-fips-border bg-fips-bg p-3 text-xs font-mono text-fips-text overflow-x-auto whitespace-pre">
        {code}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy to clipboard"}
        className="absolute top-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded border border-fips-border bg-fips-surface/90 text-fips-muted hover:text-fips-accent opacity-60 group-hover:opacity-100 transition-opacity"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}

function Step({ snippet }: { snippet: Snippet }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wider text-fips-muted">{snippet.label}</div>
      <CopyBlock code={snippet.code} />
      {snippet.notes && <p className="text-xs text-fips-muted">{snippet.notes}</p>}
    </div>
  );
}

export default function InstallPicker() {
  const [os, setOs] = useState<OsId>("debian");
  const guide = GUIDES[os];

  const verifyCode = useMemo(
    () => `fipsctl show status
fipsctl show peers
fipsctl show tree
ping6 ${TEST_PEER_NPUB}.fips`,
    []
  );

  return (
    <div className="rounded-lg border border-fips-border bg-fips-surface/30 p-4 my-6 space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Operating system">
        {(Object.keys(GUIDES) as OsId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={os === id}
            onClick={() => setOs(id)}
            className={
              os === id
                ? "px-3 py-1 rounded border border-fips-accent bg-fips-accent/10 text-fips-accent text-xs font-mono"
                : "px-3 py-1 rounded border border-fips-border text-fips-muted hover:text-fips-text text-xs font-mono"
            }
          >
            {GUIDES[id].tab}
          </button>
        ))}
      </div>

      <section aria-label="Install" className="space-y-4">
        <h3 className="text-sm font-semibold text-fips-text">1. Install</h3>
        {guide.install.map((s) => (
          <Step key={s.label} snippet={s} />
        ))}
      </section>

      <section aria-label="Bootstrap peer" className="space-y-2">
        <h3 className="text-sm font-semibold text-fips-text">2. Point at the test mesh</h3>
        {guide.testPeerPreconfigured ? (
          <p className="text-sm text-fips-muted">
            The package already ships <code className="font-mono">fips-test-node</code> in{" "}
            <code className="font-mono">/etc/fips/fips.yaml</code>. Skip to step 3.
          </p>
        ) : (
          <>
            <p className="text-sm text-fips-muted">
              Paste this block under <code className="font-mono">peers:</code> in your config and
              save before starting the daemon.
            </p>
            <CopyBlock code={TEST_PEER_YAML} />
          </>
        )}
      </section>

      <section aria-label="Start" className="space-y-4">
        <h3 className="text-sm font-semibold text-fips-text">3. Start the node</h3>
        {guide.start.map((s) => (
          <Step key={s.label} snippet={s} />
        ))}
      </section>

      <section aria-label="Verify" className="space-y-2">
        <h3 className="text-sm font-semibold text-fips-text">4. Verify you are on the mesh</h3>
        <p className="text-sm text-fips-muted">
          Within a few seconds of starting, <code className="font-mono">fipsctl show peers</code>{" "}
          should list <code className="font-mono">fips-test-node</code> with an active link, and the
          tree should have more than one node in it.
        </p>
        <CopyBlock code={verifyCode} />
      </section>
    </div>
  );
}
