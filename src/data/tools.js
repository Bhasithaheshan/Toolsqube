// Aluth tool ekak danna: methana object ekak add karanna,
// ita passe public/scripts/<script> file eka hadanna.
export const categories = [
  { slug: 'audio', name: 'Audio' },
  { slug: 'video', name: 'Video' },
  { slug: 'image', name: 'Image' },
  { slug: 'pdf', name: 'PDF' },
];

const privacyQ = {
  q: 'Is my file uploaded anywhere?',
  a: 'No. Everything happens inside your browser, on your own device. Your file is never sent to ToolsQube or any server.',
};

export const baseTools = [
  {
    slug: 'audio-splitter',
    category: 'audio',
    title: 'Audio Splitter',
    description: 'Cut an audio file into equal parts of any length. Free, runs in your browser.',
    seoTitle: 'Audio Splitter Online – Split Audio into Equal Parts | Free',
    intro: 'Split a long recording, lecture or podcast into equal parts, for example one file every 5 minutes. It runs in your browser, so nothing is uploaded.',
    script: 'audio-splitter.js',
    howTo: [
      'Choose your audio file (MP3, WAV, M4A and most other formats).',
      'Enter the length of each part in minutes or seconds. The tool tells you how many parts you will get.',
      'Click Split audio, then download each part or all of them at once.',
    ],
    faq: [
      privacyQ,
      { q: 'What happens to the leftover time at the end?', a: 'The last part holds whatever is left. A 5 minute file split every 2 minutes gives two 2 minute parts and one 1 minute part.' },
      { q: 'What format are the parts saved in?', a: 'WAV. It keeps full quality, but WAV files are larger than MP3.' },
    ],
  },
  {
    slug: 'audio-cutter',
    category: 'audio',
    title: 'Audio Cutter',
    description: 'Cut audio at any time, or extract one section like 0:48 to 0:55. Free, runs in your browser.',
    seoTitle: 'Audio Cutter Online – Trim, Split or Remove a Section | Free',
    intro: 'Cut an audio file exactly where you want. Split it at any times, keep only one section, or remove a section and join the rest into one file.',
    script: 'audio-cutter.js',
    howTo: [
      'Choose your audio file and play it to find the exact times you need.',
      'Pick a mode: split at points, extract one section, or remove a section.',
      'Enter the times (like 0:48 and 0:55) and click Cut audio. Then download the result.',
    ],
    faq: [
      privacyQ,
      { q: 'Can I remove a part from the middle of a recording?', a: 'Yes. Use Remove section, enter the start and end of the part you want gone, and the parts before and after are joined into one file.' },
      { q: 'How do I write the times?', a: 'Use seconds (48) or minutes and seconds (1:05). You can also use hours, like 1:02:30.' },
    ],
  },
  {
    slug: 'video-cutter',
    category: 'video',
    title: 'Video Cutter',
    description: 'Split a video at any time, or extract one section. Free, runs in your browser.',
    seoTitle: 'Video Cutter Online – Trim, Split or Remove a Section | Free',
    intro: 'Cut a video without installing anything. Split it at any time, keep one section, or remove a section and join the rest. Your video stays on your device.',
    script: 'video-cutter.js',
    howTo: [
      'Choose your video file. It appears in the player so you can find the times.',
      'Pick a mode: split at points, extract one section, or remove a section.',
      'Enter the times and click Cut video. Keep the tab open until it finishes, then download.',
    ],
    faq: [
      privacyQ,
      { q: 'Why does cutting take as long as the clip?', a: 'The tool records the section while it plays, entirely in your browser. A 10 second clip takes about 10 seconds.' },
      { q: 'Which browser works best?', a: 'Chrome or Edge on a computer. The result is saved as MP4 or WebM, depending on what your browser supports.' },
    ],
  },
  {
    slug: 'image-compressor',
    category: 'image',
    title: 'Image Compressor',
    description: 'Shrink a photo to the file size you choose, like 4 MB down to 1 MB. Free, runs in your browser.',
    seoTitle: 'Compress Image to Exact Size (KB or MB) Online – Free',
    intro: 'Choose the file size you need, such as 100 KB or 1 MB, and the tool shrinks your image to fit under it. Your image is never uploaded.',
    script: 'image-compressor.js',
    group: 'image-size',
    groupTitle: 'Compress an image to a specific size',
    howTo: [
      'Choose your image. The tool shows its original size, like 4.00 MB.',
      'Type the size you want, for example 1 MB, or tap one of the quick buttons.',
      'Click Compress image, check the preview and download it.',
    ],
    faq: [
      privacyQ,
      { q: 'How does it make the file smaller?', a: 'It lowers the image quality as little as it can to reach your target. If that is not enough, it also reduces the width and height slightly.' },
      { q: 'What happens to PNG files?', a: 'PNG cannot be shrunk by lowering quality, so it is saved as JPEG or WebP. Transparent areas become white in JPEG.' },
    ],
  },
  {
    slug: 'color-palette-extractor',
    category: 'image',
    title: 'Color Palette Extractor',
    description: 'Upload a screenshot of any web page and pull out its colors as HEX codes. Free, runs in your browser.',
    seoTitle: 'Color Palette Extractor from Screenshot – Get HEX Codes | Free',
    intro: 'Upload or paste a screenshot of any website or design and get its main colors as HEX codes. You can also click the image to pick an exact color.',
    script: 'color-palette.js',
    howTo: [
      'Upload a screenshot, or paste one with Ctrl+V.',
      'See the main colors with their HEX codes and how much of the image each covers. Click a color to copy it.',
      'Use the picker below to click any spot on the image and add its exact color.',
    ],
    faq: [
      privacyQ,
      { q: 'Can I get the colors as CSS?', a: 'Yes. Use Copy as CSS variables to get a ready-made :root block.' },
      { q: 'Why is a small accent color missing?', a: 'The palette picks the colors that cover the most area. Increase the number of colors, or click the exact spot with the picker.' },
    ],
  },
];

// Pages for specific sizes. They reuse the Image Compressor with the size preset.
const sizes = [
  { n: 50, unit: 'KB', label: '50KB',
    uses: 'Many application forms, exam registrations and ID uploads ask for a photo or signature under 50 KB.',
    q: 'Is 50KB enough for a passport size photo?',
    a: 'Usually yes for a small passport style photo. The tool shrinks the pixel size only when it has to, so check the dimensions your form asks for.' },
  { n: 100, unit: 'KB', label: '100KB',
    uses: 'Job applications, visa forms and government portals often limit uploads to 100 KB.',
    q: 'How can I get a photo under 100KB without it looking bad?',
    a: 'Pick JPEG for photos or WebP for smaller files. The tool keeps the quality as high as it can while staying under 100 KB.' },
  { n: 200, unit: 'KB', label: '200KB',
    uses: 'Profile pictures, web form uploads and email signatures usually work well at 200 KB.',
    q: 'Is 200KB a good size for website images?',
    a: 'Yes. Smaller images make pages load faster. WebP usually gives a smaller file than JPEG at the same quality.' },
  { n: 500, unit: 'KB', label: '500KB',
    uses: 'Email attachments, scanned pages and website uploads often have a 500 KB limit.',
    q: 'Can I compress a scanned document image to 500KB?',
    a: 'Yes, if the scan is an image file (JPG or PNG). For a multi-page PDF you need a PDF tool instead.' },
  { n: 1, unit: 'MB', label: '1MB',
    uses: 'Many websites, apps and online forms limit uploads to 1 MB, while a phone photo is often 3 to 6 MB.',
    q: 'How do I reduce a 4MB photo to 1MB?',
    a: 'Choose the photo, keep the target at 1 MB and click Compress. A 4 MB phone photo normally fits under 1 MB with little visible change.' },
];
const sizeTools = sizes.map((s) => ({
  slug: `compress-image-to-${s.label.toLowerCase()}`,
  category: 'image',
  hidden: true,
  group: 'image-size',
  groupTitle: 'Compress an image to a specific size',
  preset: { size: s.n, unit: s.unit },
  title: `Compress Image to ${s.label}`,
  description: `Reduce any photo to under ${s.n} ${s.unit} online. Free, runs in your browser.`,
  seoTitle: `Compress Image to ${s.label} Online – Free Image Size Reducer`,
  intro: `${s.uses} Choose your image and it is shrunk to under ${s.n} ${s.unit}, right in your browser.`,
  script: 'image-compressor.js',
  howTo: [
    'Choose your image. The tool shows its original size.',
    `The target is already set to ${s.n} ${s.unit}. You can change it if you need to.`,
    `Click Compress image, check the preview and download your file under ${s.n} ${s.unit}.`,
  ],
  faq: [
    { q: `Will the quality drop when I compress to ${s.label}?`, a: 'Only as much as needed. The tool lowers quality gradually and only reduces the image dimensions if quality alone is not enough.' },
    { q: s.q, a: s.a },
    privacyQ,
  ],
}));


const pdfCommon = {
  category: 'pdf',
  script: 'pdf-organizer.js',
  libs: ['/vendor/pdf.min.js', '/vendor/pdf-lib.min.js'],
  wide: true,
  group: 'pdf-pages',
  groupTitle: 'More ways to use the PDF page tool',
};
const pdfHow = [
  'Choose your PDF. Every page appears as a thumbnail.',
  'Click the pages you want, or type a range like 1-10, 15, 20-25 and click Select these.',
  'Download the pages you picked, or delete the pages you do not need and download what remains.',
];
const pdfFaqs = [
  { q: 'Is my PDF uploaded anywhere?', a: 'No. The PDF is opened and edited inside your browser, on your own device. It is never sent to ToolsQube or any server.' },
  { q: 'Do the page numbers change after I delete pages?', a: 'No. Page numbers on the thumbnails and in ranges always refer to the original PDF. Your download has the remaining pages in order.' },
  { q: 'Can I undo a delete?', a: 'Yes. Click Restore deleted to bring every deleted page back before you download.' },
  { q: 'Can I open a password protected PDF?', a: 'Not directly. Remove the password first, then upload the file here.' },
];
const pdfTools = [
  {
    ...pdfCommon,
    slug: 'pdf-organizer',
    title: 'PDF Organizer',
    description: 'Delete pages, extract a page range or pick pages, then download a new PDF. Free, runs in your browser.',
    seoTitle: 'PDF Page Organizer – Delete, Extract or Select PDF Pages | Free',
    intro: 'See every page of your PDF, remove the ones you do not need, or pull out a range like pages 1 to 10. Download the result as a new PDF. Your file never leaves your device.',
    howTo: pdfHow,
    faq: pdfFaqs,
  },
  {
    ...pdfCommon,
    slug: 'delete-pages-from-pdf',
    hidden: true,
    title: 'Delete Pages from PDF',
    description: 'Remove unwanted pages from a PDF and download the rest. Free, runs in your browser.',
    seoTitle: 'Delete Pages from PDF Online – Remove PDF Pages Free',
    intro: 'Upload a PDF, click the pages you want to remove, press Delete selected and download the pages that are left. Nothing is uploaded.',
    howTo: [
      'Choose your PDF and wait for the page thumbnails.',
      'Click the pages you want to remove. Hold Shift to select a run of pages quickly.',
      'Click Delete selected, then Download remaining pages.',
    ],
    faq: pdfFaqs,
  },
  {
    ...pdfCommon,
    slug: 'extract-pages-from-pdf',
    hidden: true,
    title: 'Extract Pages from PDF',
    description: 'Save a page range or chosen pages of a PDF as a new file. Free, runs in your browser.',
    seoTitle: 'Extract Pages from PDF Online – Split a PDF by Page Range',
    intro: 'Need only part of a PDF? Type a range like 1-10, or click individual pages, and download them as a new PDF. It all happens in your browser.',
    howTo: [
      'Choose your PDF and wait for the page thumbnails.',
      'Type a range such as 1-10, or several like 1-3, 8, 12-15 in the box.',
      'Click Download these pages. You can also click pages and use Download selected.',
    ],
    faq: pdfFaqs,
  },
];

export const tools = [...baseTools, ...pdfTools, ...sizeTools];
