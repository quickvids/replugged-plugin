import { Injector, Logger, common } from "replugged";

const inject = new Injector();
const logger = Logger.plugin("PluginTemplate");
const { toast } = common;

async function fetchQuickVidsLink(content: string): Promise<string> {
  const response = await fetch(
    "https://api.quickvids.win/v1/shorturl/create",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      body: JSON.stringify({ input_text: content }),
    },
  );
  const data = await response.json();
  if (data.quickvids_url) {
    return data.quickvids_url;
  }
  toast.toast(
    "Failed to convert a TikTok link(s) to QuickVids link(s).",
    toast.Kind.FAILURE,
    { duration: 2000, position: toast.Position.BOTTOM },
  );
  return content;
}

const patterns = [
  /(http:|https:\/\/)?(www\.)?tiktok\.com\/(@.{1,24}|@[a-zA-Z0-9-_]{50,80})\/video\/(\d{1,30})(\?.*)?/,
  /(http:|https:\/\/)?(www\.)?tiktok.com\/t\/(\w{5,15})(\?.*)?/,
  /(http:|https:\/\/)?((?!ww)\w{2})\.tiktok.com\/(\w{5,15})(\?.*)?/,
  /(http:|https:\/\/)?(m\.|www\.)?tiktok\.com\/v\/(\d{1,30})(\?.*)?/,
  /(http:|https:\/\/)?(www)?\.tiktok\.com\/(.*)item_id=(\d{1,30})(\?.*)?/,
  // /(http:|https:\/\/)?(www\.)?instagram\.com\/reel\/([a-zA-Z0-9-_]{5,15})(\/)?(\?.*)?/,
];

function checkForLinks(content: string): string[] {
  const matchedLinks: string[] = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern, "g");
    const matches = content.match(regex);
    if (matches) {
      matchedLinks.push(...matches);
    }
  }

  return matchedLinks;
}

async function replaceLinks(content: string): Promise<string> {
  const links = checkForLinks(content);
  const originalContent = content;
  if (links.length > 0) {
    toast.toast(
      "Found TikTok link(s)! Please wait while we convert them to QuickVids links.",
      toast.Kind.MESSAGE,
      { duration: 2500, position: toast.Position.BOTTOM },
    );
  }
  for (const link of links) {
    try {
      const quickvidsLink = await fetchQuickVidsLink(link);
      content = content.replace(link, quickvidsLink);
    } catch (error) {
      logger.error(error);
      toast.toast(
        "Failed to convert a TikTok link(s) to QuickVids link(s).",
        toast.Kind.FAILURE,
        { duration: 2000, position: toast.Position.BOTTOM },
      );
    }
  }
  if (content !== originalContent) {
    toast.toast(
      "Successfully converted TikTok link(s) to QuickVids link(s).",
      toast.Kind.SUCCESS,
      { duration: 2000, position: toast.Position.BOTTOM },
    );
  }
  return content;
}

export function start(): void {
  inject.instead(common.messages, "sendMessage", async (args, fn) => {
    let { content } = args[1];
    try {
      content = await replaceLinks(content);
      args[1].content = content;
    } catch (error) {
      logger.error(error);
      toast.toast(
        "Critical error while converting TikTok link(s) to QuickVids link(s).",
        toast.Kind.FAILURE,
        { duration: 2000, position: toast.Position.BOTTOM },
      );
    }

    // NOTE: With all of the try/catch blocks, this plugin should never block a message from being sent.

    return fn(...args);
  });
}

export function stop(): void {
  inject.uninjectAll();
}
