// ─────────────────────────────────────────────────────────────
// AI 寵物貼圖機：提示詞
// 想調整畫風，改這個文件就行，不用動其他程式。
// 圖像模型對英文提示詞的理解通常最穩定，所以提示詞用英文寫，
// 每段旁邊附中文說明。
// ─────────────────────────────────────────────────────────────

// 三種畫風（對應網頁上的三個按鈕）
export const STYLES = {
  quirky: {
    label: '搞怪手繪',
    // 粗黑手繪線條、誇張表情、有點不屑又可愛，Sofi 最主打的風格
    prompt:
      'quirky hand-drawn cartoon style, bold uneven black ink outlines, flat bright colours with a little texture, ' +
      'exaggerated funny expression (smug, sleepy, side-eye or cheeky grin), slightly chunky proportions, playful attitude',
  },
  japanese: {
    label: '日式可愛',
    // 日系貼圖：柔和配色、圓潤、可以有和風小道具
    prompt:
      'cute Japanese sticker illustration style, soft rounded shapes, warm pastel palette, clean thin outlines, ' +
      'gentle blush on the cheeks, may hold a small Japanese prop such as a melon bread, onigiri or a tea cup',
  },
  street: {
    label: '街頭塗鴉',
    // 街頭風：噴漆質感、粗線條、潮流感
    prompt:
      'street graffiti sticker style, thick marker outlines, spray-paint texture, bold saturated colours, ' +
      'cool streetwear attitude, can wear sunglasses or a cap, urban pop-art energy',
  },
};

// 所有畫風共用的規格：保證做出來的東西能直接印在衣服上
const PRINT_SPEC =
  'Output a single die-cut sticker: one character only, centred, full body or head-and-shoulders, ' +
  'with a thick clean white sticker border around the whole silhouette, on a plain pure white background. ' +
  'No text, no letters, no watermark, no logo, no people, no extra objects in the background. ' +
  'High contrast and crisp edges so it prints well on a T-shirt.';

// 模式一：觀眾上傳寵物照片
// 重點是「認得出是自己的寵物」：毛色、花紋、品種、耳朵形狀都要保留
export function photoPrompt(styleKey) {
  const style = STYLES[styleKey] ?? STYLES.quirky;
  return [
    'Turn the pet in this photo into a sticker character.',
    'Keep it clearly recognisable as the same animal: same species and breed, same fur colours and markings,',
    'same ear shape, eye colour and any distinctive features (spots, patches, collar colour).',
    `Draw it in this style: ${style.prompt}.`,
    'If there are people or other animals in the photo, ignore them and draw only the main pet.',
    PRINT_SPEC,
  ].join(' ');
}

// 模式二：觀眾用文字描述一隻動物
export function textPrompt(styleKey, description) {
  const style = STYLES[styleKey] ?? STYLES.quirky;
  return [
    'Create a sticker character of this animal, described by the user (it may be in Chinese):',
    `"${description}".`,
    'Follow the description closely (species, colours, outfit, props, mood),',
    'but keep it friendly and suitable for all ages.',
    `Draw it in this style: ${style.prompt}.`,
    PRINT_SPEC,
  ].join(' ');
}
