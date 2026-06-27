/**
 * MagicProvider
 *
 * Wraps the app with a Magic Labs SDK instance for social login.
 * Provides useMagic() hook to any child component.
 *
 * Env vars required:
 *   VITE_MAGIC_PUBLISHABLE_KEY — from https://dashboard.magic.link
 *
 * TODO:
 *   - Add @magic-ext/oauth2 for Google OAuth flow
 *   - Persist session with magic.user.isLoggedIn()
 *   - Expose ethers provider: new ethers.BrowserProvider(magic.rpcProvider)
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { InstanceWithExtensions, SDKBase, Magic } from "magic-sdk";
import { OAuthExtension } from "@magic-ext/oauth2";

type MagicInstance = InstanceWithExtensions<SDKBase, OAuthExtension[]>;

interface MagicContextValue {
  magic: MagicInstance | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  userEmail: string | null;
  walletAddress: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const MagicContext = createContext<MagicContextValue>({
  magic: null,
  isLoggedIn: false,
  isLoading: true,
  userEmail: null,
  walletAddress: null,
  login: async () => {},
  logout: async () => {},
});

export function useMagic() {
  return useContext(MagicContext);
}

interface MagicProviderProps {
  children: ReactNode;
}

export function MagicProvider({ children }: MagicProviderProps) {
  const [magic, setMagic] = useState<MagicInstance | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const key = import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY;
    if (!key) {
      console.warn("[MagicProvider] VITE_MAGIC_PUBLISHABLE_KEY is not set.");
      setIsLoading(false);
      return;
    }

    const m = new Magic(key, {
      extensions: [new OAuthExtension()],
      network: {
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
        chainId: 421614, // Arbitrum Sepolia
      },
    });

    setMagic(m);

    m.user.isLoggedIn().then(async (loggedIn) => {
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        const info = await m.user.getInfo();
        setUserEmail(info.email ?? null);
        const accounts = await m.wallet.connectWithUI();
        setWalletAddress(accounts[0] ?? null);
      }
      setIsLoading(false);
    });
  }, []);

  const login = async () => {
    if (!magic) return;
    setIsLoading(true);
    try {
      // TODO: swap to OAuth redirect flow with OAuthExtension
      // magic.oauth.loginWithRedirect({ provider: "google", redirectURI: window.location.href })
      const accounts = await magic.wallet.connectWithUI();
      const info = await magic.user.getInfo();
      setUserEmail(info.email ?? null);
      setWalletAddress(accounts[0] ?? null);
      setIsLoggedIn(true);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!magic) return;
    await magic.user.logout();
    setIsLoggedIn(false);
    setUserEmail(null);
    setWalletAddress(null);
  };

  return (
    <MagicContext.Provider
      value={{ magic, isLoggedIn, isLoading, userEmail, walletAddress, login, logout }}
    >
      {children}
    </MagicContext.Provider>
  );
}
