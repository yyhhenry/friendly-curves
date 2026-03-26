import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  Send,
  Inbox,
  Info,
  Trash2,
  KeyRoundIcon,
  Sun,
  Moon,
  Monitor,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import {
  generateKeyPair,
  getPublicKeyFromPrivate,
  encrypt,
  decrypt,
  publicKeyToBase64,
  privateKeyToBase64,
  base64ToPublicKey,
  base64ToPrivateKey,
} from "@/lib/crypto"

function CopyButton({
  text,
  label,
  onBeforeCopy,
}: {
  text: string
  label?: string
  onBeforeCopy?: () => boolean
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    if (onBeforeCopy && !onBeforeCopy()) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="size-4" /> 已复制
        </>
      ) : (
        <>
          <Copy className="size-4" /> {label ?? "复制"}
        </>
      )}
    </Button>
  )
}

function SendTab() {
  const [receiverPubKey, setReceiverPubKey] = useState("")
  const [message, setMessage] = useState("")
  const [ciphertext, setCiphertext] = useState("")
  const [error, setError] = useState("")
  const [encrypting, setEncrypting] = useState(false)

  const isPubKeyValid = () => {
    try {
      const bytes = base64ToPublicKey(receiverPubKey.trim())
      return bytes.length === 32
    } catch {
      return false
    }
  }

  const handleEncrypt = async () => {
    setError("")
    setEncrypting(true)
    try {
      const pubKey = base64ToPublicKey(receiverPubKey.trim())
      const result = await encrypt(message, pubKey)
      setCiphertext(result)
    } catch {
      setError("加密失败，请检查公钥是否正确")
    } finally {
      setEncrypting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge>第一步</Badge> 粘贴对方的公钥
          </CardTitle>
          <CardDescription>
            让接收方在「我要接收」页面生成密钥对，然后把公钥发给你
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="在此粘贴接收方的公钥..."
            value={receiverPubKey}
            onChange={(e) => {
              setReceiverPubKey(e.target.value)
              setCiphertext("")
              setError("")
            }}
          />
          {receiverPubKey && !isPubKeyValid() && (
            <p className="mt-2 text-xs text-destructive">
              公钥格式不正确，请检查是否完整复制
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge>第二步</Badge> 输入要加密的内容
          </CardTitle>
          <CardDescription>
            写下你想要加密发送的消息，只有持有对应私钥的人才能解密
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="在此输入要加密的内容..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              setCiphertext("")
            }}
            rows={4}
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={handleEncrypt}
              disabled={!isPubKeyValid() || !message.trim() || encrypting}
            >
              <Lock className="size-4" /> {encrypting ? "加密中..." : "加密"}
            </Button>
            {!isPubKeyValid() && (
              <p className="text-xs text-muted-foreground">请输入公钥</p>
            )}
            {isPubKeyValid() && !message.trim() && (
              <p className="text-xs text-muted-foreground">
                请输入要加密的内容
              </p>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {ciphertext && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>第三步</Badge> 复制密文发送给对方
            </CardTitle>
            <CardDescription>
              把下面的密文通过社交媒体发给接收方，只有对方能解密看到原文
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              readOnly
              value={ciphertext}
              rows={4}
              className="font-mono text-xs"
            />
            <CopyButton text={ciphertext} label="复制密文" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const LOCALSTORAGE_KEY = "friendly-curves-private-key"

function ReceiveTab() {
  const [keyPair, setKeyPair] = useState<{
    privateKey: Uint8Array
    publicKey: Uint8Array
  } | null>(null)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [privateKeyInput, setPrivateKeyInput] = useState("")
  const [ciphertext, setCiphertext] = useState("")
  const [plaintext, setPlaintext] = useState("")
  const [error, setError] = useState("")
  const [decrypting, setDecrypting] = useState(false)
  const [restoreMode, setRestoreMode] = useState(false)

  const applyKeyPair = useCallback(
    (kp: { privateKey: Uint8Array; publicKey: Uint8Array }) => {
      setKeyPair(kp)
      localStorage.setItem(LOCALSTORAGE_KEY, privateKeyToBase64(kp.privateKey))
      setShowPrivateKey(false)
      setCiphertext("")
      setPlaintext("")
      setError("")
      setRestoreMode(false)
    },
    []
  )

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALSTORAGE_KEY)
      if (stored) {
        const privKey = base64ToPrivateKey(stored)
        if (privKey.length === 32) {
          const pubKey = getPublicKeyFromPrivate(privKey)
          setKeyPair({ privateKey: privKey, publicKey: pubKey })
        }
      }
    } catch {
      /* ignore invalid data */
    }
  }, [])

  const handleGenerate = () => {
    const kp = generateKeyPair()
    applyKeyPair(kp)
  }

  const handleClear = () => {
    if (
      !confirm("确定要清除本地保存的密钥对吗？清除后将无法解密之前加密的消息。")
    )
      return
    localStorage.removeItem(LOCALSTORAGE_KEY)
    setKeyPair(null)
    setShowPrivateKey(false)
    setCiphertext("")
    setPlaintext("")
    setError("")
  }

  const handleRestore = () => {
    try {
      const privKey = base64ToPrivateKey(privateKeyInput.trim())
      if (privKey.length !== 32) throw new Error("invalid length")
      const pubKey = getPublicKeyFromPrivate(privKey)
      applyKeyPair({ privateKey: privKey, publicKey: pubKey })
    } catch {
      setError("私钥格式不正确，请检查是否完整复制")
    }
  }

  const handleDecrypt = async () => {
    if (!keyPair) return
    setError("")
    setDecrypting(true)
    try {
      const result = await decrypt(ciphertext.trim(), keyPair.privateKey)
      setPlaintext(result)
    } catch {
      setError(
        "解密失败。请确认：1) 密文是否完整复制 2) 是否使用了正确的密钥对"
      )
    } finally {
      setDecrypting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge>第一步</Badge> 准备你的密钥对
          </CardTitle>
          <CardDescription>
            生成一对密钥——公钥用来让别人加密消息给你，私钥用来解密收到的消息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerate}>
              <Key className="size-4" /> {keyPair ? "重新生成" : "生成密钥对"}
            </Button>
            {keyPair && (
              <Button variant="outline" onClick={handleClear}>
                <Trash2 className="size-4" /> 清除本地密钥
              </Button>
            )}
            {!keyPair && (
              <Button
                variant="outline"
                onClick={() => setRestoreMode(!restoreMode)}
              >
                从已有私钥恢复
              </Button>
            )}
          </div>
          {restoreMode && (
            <div className="space-y-2">
              <Input
                placeholder="粘贴之前保存的私钥..."
                value={privateKeyInput}
                onChange={(e) => {
                  setPrivateKeyInput(e.target.value)
                  setError("")
                }}
              />
              <Button variant="outline" size="sm" onClick={handleRestore}>
                恢复密钥对
              </Button>
            </div>
          )}
          {error && !ciphertext && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Alert>
            <Info className="size-4" />
            <AlertTitle>关于私钥</AlertTitle>
            <AlertDescription>
              密钥对会自动保存在本地浏览器中，刷新页面不会丢失。
              <br />
              注意：重新生成或清除密钥后，之前加密的消息将无法解密，请谨慎操作！
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {keyPair && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>第二步</Badge> 把公钥发给对方
            </CardTitle>
            <CardDescription>
              公钥是公开的，可以放心分享给任何人。发送方需要用你的公钥来加密消息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-muted p-3 font-mono text-xs break-all select-all">
              {publicKeyToBase64(keyPair.publicKey)}
            </div>
            <CopyButton
              text={publicKeyToBase64(keyPair.publicKey)}
              label="复制公钥"
            />
          </CardContent>
        </Card>
      )}

      {keyPair && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">可选</Badge> 查看私钥
            </CardTitle>
            <CardDescription>
              私钥是你解密消息的唯一凭证，<strong>绝对不要分享给任何人</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">
              {showPrivateKey
                ? privateKeyToBase64(keyPair.privateKey)
                : "••••••••••••••••••••••••••••••••••••••••••••"}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? (
                  <>
                    <EyeOff className="size-4" /> 隐藏
                  </>
                ) : (
                  <>
                    <Eye className="size-4" /> 显示
                  </>
                )}
              </Button>
              {showPrivateKey && (
                <CopyButton
                  text={privateKeyToBase64(keyPair.privateKey)}
                  label="复制私钥"
                  onBeforeCopy={() =>
                    confirm(
                      "⚠️ 注意：复制私钥仅在你学习算法原理或需要长期保存密钥时才有必要。\n\n请确保不要将私钥发送给任何人！\n\n确定要复制吗？"
                    )
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {keyPair && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge>第三步</Badge> 粘贴收到的密文
              </CardTitle>
              <CardDescription>
                把发送方发来的加密密文粘贴到下面，点击解密即可查看原文
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="在此粘贴收到的密文..."
                value={ciphertext}
                onChange={(e) => {
                  setCiphertext(e.target.value)
                  setPlaintext("")
                  setError("")
                }}
                rows={4}
                className="font-mono text-xs"
              />
              <Button
                onClick={handleDecrypt}
                disabled={!ciphertext.trim() || decrypting}
              >
                <Unlock className="size-4" />{" "}
                {decrypting ? "解密中..." : "解密"}
              </Button>
              {error && ciphertext && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {plaintext && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="outline">🎉 解密成功</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-muted p-4 whitespace-pre-wrap">
              {plaintext}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next: Record<string, "dark" | "light" | "system"> = {
    system: "light",
    light: "dark",
    dark: "system",
  }
  const Icon = theme === "system" ? Monitor : theme === "light" ? Sun : Moon
  const label =
    theme === "system" ? "跟随系统" : theme === "light" ? "浅色模式" : "深色模式"
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next[theme])}
      title={label}
    >
      <Icon className="size-4" />
    </Button>
  )
}

export default function App() {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-6 space-y-3">
        <h1 className="flex items-center justify-between text-2xl font-bold tracking-tight">
          <span className="flex items-center gap-2">
            <KeyRoundIcon /> 非对称加密（老妈都看得懂）
          </span>
          <ThemeToggle />
        </h1>
        <p className="text-sm text-muted-foreground">
          在浏览器中加密不方便明文传输的简短内容，无需注册，无需安装。
        </p>
        <Alert>
          <Info className="size-4" />
          <AlertTitle>工作原理</AlertTitle>
          <AlertDescription>
            接收方生成一对密钥（公钥 +
            私钥），将公钥分享给发送方。发送方用公钥加密内容后，只有持有私钥的接收方才能解密，任何第三方都无法从密文还原原文。本工具建立在「社交媒体可能泄露内容但不会篡改内容」的前提下，比直接明文传输安全得多。
          </AlertDescription>
        </Alert>
      </div>

      <Tabs defaultValue="send">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="send" className="flex-1">
            <Send className="size-4" /> 我要发送
          </TabsTrigger>
          <TabsTrigger value="receive" className="flex-1">
            <Inbox className="size-4" /> 我要接收
          </TabsTrigger>
        </TabsList>
        <TabsContent value="send">
          <SendTab />
        </TabsContent>
        <TabsContent value="receive">
          <ReceiveTab />
        </TabsContent>
      </Tabs>

      <footer className="mt-8 space-y-1 text-center text-xs text-muted-foreground">
        <p>所有操作均在浏览器本地完成，不会上传任何数据</p>
        <p>
          基于 Curve25519 + AES-256-GCM ·{" "}
          <a
            href="https://github.com/yyhhenry/friendly-curves"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}
