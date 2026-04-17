import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { generateFullIdentity, hexEncode, type FipsIdentity } from "../lib/crypto";

const steps = [
  { key: "privateKey", label: "Private Key (nsec)", who: "Only you. Never leaves your node." },
  {
    key: "publicKey",
    label: "Public Key (compressed)",
    who: "Shared during Noise handshakes with direct peers.",
  },
  {
    key: "npub",
    label: "npub (bech32)",
    who: "Application-layer identity. How other users address you.",
  },
  {
    key: "nodeAddr",
    label: "node_addr (SHA-256, 16 bytes)",
    who: "Routing identifier. What transit routers see in packet headers.",
  },
  {
    key: "ipv6",
    label: "IPv6 Address (fd00::/8)",
    who: "For legacy apps. Lets unmodified IPv6 software use the mesh.",
  },
] as const;

function formatValue(identity: FipsIdentity, key: string): string {
  switch (key) {
    case "privateKey":
      return hexEncode(identity.privateKey);
    case "publicKey":
      return hexEncode(identity.publicKey);
    case "npub":
      return identity.npub;
    case "nodeAddr":
      return hexEncode(identity.nodeAddr);
    case "ipv6":
      return identity.ipv6;
    default:
      return "";
  }
}

export default function IdentityGenerator() {
  const [identity, setIdentity] = useState<FipsIdentity | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  function generate() {
    const id = generateFullIdentity();
    setIdentity(id);
    setVisibleSteps(0);
    setCopiedKey(null);

    if (reduceMotion) {
      setVisibleSteps(steps.length);
      return;
    }
    for (let i = 1; i <= steps.length; i++) {
      setTimeout(() => setVisibleSteps(i), i * 400);
    }
  }

  async function copyValue(key: string, value: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((k) => (k === key ? null : k));
      }, 1500);
    } catch {
      // Clipboard blocked (iframe, insecure context): surface a best-effort failure.
      setCopiedKey(`${key}:error`);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  }

  return (
    <div className="my-8 rounded-lg border border-fips-border bg-fips-surface/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Identity Derivation</h3>
        <button
          onClick={generate}
          className="px-4 py-2 rounded-lg bg-fips-accent text-fips-bg font-semibold text-sm hover:bg-fips-accent/90 transition-colors"
        >
          {identity ? "Regenerate" : "Generate Identity"}
        </button>
      </div>

      {!identity && (
        <p className="text-fips-muted text-sm">
          Click the button to generate a real secp256k1 keypair and watch each derived identifier
          appear.
        </p>
      )}

      <AnimatePresence>
        {identity && (
          <div className="space-y-3">
            {steps.map((step, i) => {
              if (i >= visibleSteps) return null;
              const value = formatValue(identity, step.key);
              const isLong = value.length > 50;

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded border border-fips-border p-3"
                >
                  {i > 0 && (
                    <div className="flex justify-center -mt-6 mb-1">
                      <span className="text-fips-accent text-xs">↓ derived from above</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-fips-accent text-xs font-mono uppercase tracking-wider">
                      {step.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyValue(step.key, value)}
                      aria-label={`Copy ${step.label}`}
                      className="shrink-0 text-xs font-mono text-fips-muted hover:text-fips-accent transition-colors border border-fips-border hover:border-fips-accent/60 rounded px-2 py-0.5"
                    >
                      {copiedKey === step.key
                        ? "Copied"
                        : copiedKey === `${step.key}:error`
                          ? "Failed"
                          : "Copy"}
                    </button>
                  </div>
                  <code
                    className={`block text-sm font-mono text-fips-text ${isLong ? "break-all" : ""}`}
                  >
                    {value}
                  </code>
                  <p className="text-fips-muted text-xs mt-1">{step.who}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
