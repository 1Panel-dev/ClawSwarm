/**
 * 这个文件集中维护文本里的 @mention 协议。
 * 路由、测试和后续其它入口都应复用这里的解析函数，避免各处手写正则。
 */

// 从普通文本里提取 @token。token 当前允许字母、数字、下划线和短横线。
export function parseMentionsFromText(text: string): string[] {
    const out: string[] = [];
    const re = /@([a-zA-Z0-9_-]{1,64})/g;
    for (;;) {
        const match = re.exec(text);
        if (!match) break;
        out.push(match[1]);
    }
    return out;
}
