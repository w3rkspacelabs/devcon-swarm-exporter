import { $, fs } from "zx";
import { replaceInFileSync } from "replace-in-file";
import { DevconFolder, CacheDir, DataFiles, IndexFile } from "./config";
import { Curl } from "node-libcurl";
import sharp from "sharp";
import { mkdirp } from "fs-extra";
import { spawn } from "child_process";

export async function rewriteJsFiles() {
  try {
    console.log(`grep -r -l 'unoptimized:!1' ${DevconFolder}`);
    const out = (await $`grep -r -l 'unoptimized:!1' ${DevconFolder}`).stdout;
    const files = out.trim().split("\n");
    for (let i in files) {
      let file = files[i];
      console.log({ file });
      await $`sed -i 's/unoptimized:!1/unoptimized:!0/g' ${file}`;
    }
  } catch (error: any) {
    if (error.exitCode === 1 && error.stdout == "" && error.stderr == "") {
      console.error(`No files containing 'unoptimized:!1'`);
    } else {
      console.error(`Error fetching files containing 'unoptimized:!1'`, error);
    }
  }
}

export async function rewriteImgSrcSet(lines: string[], file: string) {
  for (let j in lines) {
    let line = lines[j];

    const options = {
      files: file,
      from: line,
      to: "",
    };

    try {
      const results = replaceInFileSync(options);
      console.log("Replacement results:", results);
    } catch (error) {
      console.error("Error occurred:", error);
    }
  }
}

export async function rewriteImgSrc(lines: string[], file: string) {
  for (let j in lines) {
    const url = lines[j].slice(5);
    if (url.includes("next/image")) {
      await fetchAndRewriteImgUrl(url, file);
    }
  }
}

export async function fetchAndRewriteImgUrl(src: string, file: string) {
  if (!src.includes("?url=")) {
    console.log(`SKIPPING "${src}" in "${file}"`);
    return;
  }
  let url = src.split("?url=")[1].replace(/&amp;/g, "&");
  let fUrl = url.split(" ")[0];
  let fetchUrl = `https://devcon.org/_next/image/?url=${fUrl}`;
  let srcData: any = decodeURIComponent(src)
    .split("?url=")[1]
    .split("&amp;")
    .map((v) => {
      return v.replace("=", "-").split(".");
    });

  let ext = srcData[0].pop();
  let decodedSrc = `${srcData[0].join(".")}_${srcData[1]}_${srcData[2]}`;
  let cacheFilename = `${decodedSrc.split("/").pop()}.${ext}`;
  let targetFilename = `${decodedSrc.split("/").pop()}.webp`;

  let targetUrl = `/_next/static/media/${targetFilename}`;

  let cacheFile = `${CacheDir}/${cacheFilename}`.replace("////g", "/");
  let targetFile = `${DevconFolder}${targetUrl}`.replace("////g", "/");

  let from = src.split(" ")[0];

  const options = {
    files: file,
    from: from,
    to: targetUrl,
  };
  console.log({
    src,
    from,
    url,
    fixedUrl: fUrl,
    fetchUrl,
    srcData,
    ext,
    decodedSrc,
    targetUrl,
    targetFile,
    cacheFile,
    options,
  });
  let makeOptimizedImage = !fs.existsSync(targetFile);
  let downloadCacheImage = !fs.existsSync(cacheFile);
  console.log(makeOptimizedImage, downloadCacheImage);
  if (downloadCacheImage) {
    await downloadFile(fetchUrl, cacheFile);
  } else {
    console.log(`SKIPPING download ${fetchUrl}`);
  }
  if (makeOptimizedImage) {
    console.log({ optimize: true, fetchUrl, cacheFile });
    await sharp(cacheFile)
      .webp({ quality: 10, alphaQuality: 100 })
      .toFile(targetFile);
  } else {
    console.log(`SKIPPING optimized webp conversion ${cacheFile}`);
  }

  try {
    const results = replaceInFileSync(options);
    console.log("Replacement results:", results);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

export async function downloadFile(fetchUrl: string, cacheFile: string) {
  if (fs.existsSync(cacheFile)) {
    console.log(`SKIPPING ${cacheFile} exists`);
    return;
  }
  await mkdirp(cacheFile.split("/").slice(0, -1).join("/"));
  return new Promise((resolve, reject) => {
    const curl = new Curl();
    const file = fs.createWriteStream(cacheFile);

    curl.setOpt("URL", fetchUrl);
    curl.setOpt("FOLLOWLOCATION", true);

    curl.on("data", (data: any, size: any, nmemb: any) => {
      file.write(data);
      return size * nmemb;
    });

    curl.on("end", () => {
      file.end();
      console.log(`Download complete: ${cacheFile}`);
      curl.close();
      resolve(true);
    });

    curl.on("error", (error) => {
      file.end();
      curl.close();
      console.error(`Error downloading file: ${error.message}`);
      reject(error);
    });

    curl.perform();
  });
}

export const cleanupDirectory = async () => {
  try {
    await $`rm -rf ${DevconFolder}/_next/image/*.html`;
    await $`rm -rf ${DevconFolder}/hts-cache`;
  } catch (error) {
    console.log(error);
  }
};

export const downloadMissingCacheFiles = async () => {
  let files: string[] = [];
  try {
    console.log(`grep -r -l "_next/static" ${DevconFolder}`);
    const out = (await $`grep -r -l "_next/static" ${DevconFolder}`).stdout;
    files = out.trim().split("\n");
    console.log({ files, total: files.length });

    for (const file of files) {
      const out = (await $`grep -o '"[./]*_next/static[^"]*"' ${file}`).stdout;
      const lines = out.trim().split("\n");
      console.log({ lines, file });
      for (const line of lines) {
        const fetchUrl = `https://devcon.org/_next/static${line
          .split("_next/static")[1]
          .slice(0, -1)}`;
        const saveFile = `${DevconFolder}/_next/static${line
          .split("_next/static")[1]
          .slice(0, -1)}`;
        console.log({ fetchUrl, saveFile });
        await downloadFile(fetchUrl, saveFile);
      }
    }
  } catch (error) {
    console.error("Error collecting JS files", error);
  }
};

export const downloadMissingChunks = async () => {
  let files: string[] = [];
  try {
    console.log(`grep -r -l "static/chunks" ${DevconFolder}`);
    const out = (await $`grep -r -l "static/chunks" ${DevconFolder}`).stdout;
    files = out
      .trim()
      .split("\n")
      .filter((v) => v.trim().endsWith(".js"));
    console.log({ files, total: files.length });
    for (let file of files) {
      console.log({ cmd: `grep -o 'static/chunks' ${file}`, file });
      const out = (await $`grep -o 'static/chunks[^"]*' ${file}`).stdout;
      const lines = out.trim().split("\n");
      let res: any = {};
      for (let line of lines) {
        if (line == "static/chunks/") {
          const out = (
            await $`grep -o  'static/chunks/"+e+"."+([^}]*}' ${file}`
          ).stdout
            .trim()
            .replace('static/chunks/"+e+"."+(', "");
          const chunkData = eval("(" + out + ")");
          for (let key in chunkData) {
            const name = chunkData[key];
            const filename = `${key}.${name}.js`;
            const cacheFile = `${DevconFolder}/_next/static/chunks/${filename}`;
            const fetchUrl = `https://devcon.org/_next/static/chunks/${filename}`;
            await downloadFile(fetchUrl, cacheFile);
          }
          console.log({ out: chunkData });
        } else if (line.endsWith(".js")) {
          const cacheFile = `${DevconFolder}/_next/${line}`;
          const fetchUrl = `https://devcon.org/_next/${line}`;

          let shouldDownload = true;
          try {
            shouldDownload = !fs.existsSync(cacheFile);
          } catch (error) {
            console.log(`${cacheFile} threw error`, error);
            process.exit(0);
          }

          if (shouldDownload) {
            await mkdirp(cacheFile.split("/").slice(0, -1).join("/"));
            try {
              await downloadFile(fetchUrl, cacheFile);
            } catch (error) {
              console.log(`${cacheFile} threw error`, error);
              process.exit(0);
            }
          }
          res[line] = shouldDownload;
        }
      }
      console.log({ lines: res });
    }
  } catch (error: any) {
    if (error.exitCode === 1 && error.stdout == "" && error.stderr == "") {
      console.error("No files containing 'static/chunks/'");
    } else {
      console.error("Error fetching files containing 'static/chunks/'", error);
    }
  }
};

export const execCommand = (
  command: string,
  args: string[]
): Promise<number> => {
  return new Promise((resolve, reject) => {
    console.log(command + " " + args.join(" "));
    const spawnedProc = spawn(command + " " + args.join(" "), [], {
      shell: true,
    });

    spawnedProc.stdout.on("data", (data) => {
      process.stdout.write(data);
    });

    spawnedProc.stderr.on("data", (data) => {
      process.stderr.write(data);
    });
  });
};

const buildId = async () => {
  try {
    const file = `${DevconFolder}/en/index.html`;
    console.log(`grep -o '/_next/static/[^/]*/_buildManifest.js' ${file}`);
    const out = (
      await $`grep -o '/_next/static/[^/]*/_buildManifest.js' ${file}`
    ).stdout;
    const buildid = out
      .trim()
      .replace("/_next/static/", "")
      .replace("/_buildManifest.js", "");
    return buildid;
  } catch (error) {
    console.error("Error fetching buildId", error);
  }
};

export const addIndex = () => {
  fs.writeFileSync(`${DevconFolder}/index.html`, IndexFile);
};

export const removeHtmlComments = async () => {
  console.log(`grep -r -l '<!-- ' ${DevconFolder}`);
  const out = (await $`grep -r -l '<!-- ' ${DevconFolder}`).stdout;
  const files = out.trim().split("\n");
  for (let file of files) {
    console.log({ file });
    await $`sed -i 's/<!--.*-->//g' ${file}`;
  }
};

export const downloadCssUrls = async () => {
  try {
    console.log(`grep -r -l "url(" ${DevconFolder}`);
    const out = (await $`grep -r -l "url(" ${DevconFolder}`).stdout;
    const files = out.trim().split("\n");
    console.log({ files });
    for (let file of files) {
      const out = (await $`grep -o 'url([^)]*)' ${file}`).stdout;
      const lines = out
        .trim()
        .split("\n")
        .filter((v) => v.startsWith("url(../media/"));
      for (let line of lines) {
        line = line.slice(7, -1);
        const fetchUrl = `https://devcon.org/_next/static/${line}`;
        const saveFile = `${DevconFolder}/_next/static/${line}`;
        console.log({ line, fetchUrl, saveFile });
        await downloadFile(fetchUrl, saveFile);
      }
    }
  } catch (error: any) {
    if (error.exitCode === 1 && error.stdout == "" && error.stderr == "") {
      console.error("No files containing 'next/image'");
    } else {
      console.error("Error fetching files containing 'next/image'", error);
    }
  }
};

export const downloadNextDataFiles = async () => {
  try {
    const buildID = await buildId();

    for (const filename of DataFiles) {
      const fetchUrl = `https://devcon.org/_next/data/${buildID}/${filename}.json`;
      const cacheFile = `${DevconFolder}/_next/data/${buildID}/${filename}.json`;
      console.log({ fetchUrl, saveFile: cacheFile });
      await downloadFile(fetchUrl, cacheFile);
    }
  } catch (error) {
    console.error("Error collecting _next/data files", error);
  }
};

export const updateJsFiles = async () => {
  try {
    await rewriteJsFiles();
  } catch (error) {
    console.error("Error rewriting JS files", error);
  }
};

export const fetchNextjsImages = async () => {
  try {
    console.log(`grep -r -l "next/image" ${DevconFolder}`);
    const out = (await $`grep -r -l "next/image" ${DevconFolder}`).stdout;
    const files = out.trim().split("\n");
    return files;
  } catch (error: any) {
    if (error.exitCode === 1 && error.stdout == "" && error.stderr == "") {
      console.error("No files containing 'next/image'");
    } else {
      console.error("Error fetching files containing 'next/image'", error);
    }
  }
};

export const updateImageSrcSetValues = async (file: string) => {
  console.log({ file, cmd: `grep -o 'srcSet="[^"]*"' ${file}` });
  try {
    const out = (await $`grep -o 'srcSet="[^"]*"' ${file}`).stdout;
    const lines = out.trim().split("\n");
    await rewriteImgSrcSet(lines, file);
    console.log({ rewriteImgSrcSet: true });
  } catch (error: any) {
    if (error.exitCode === 1 && error.stdout == "" && error.stderr == "") {
      console.error(`${file} does not contain 'srcSet="[^"]*"'`);
    } else {
      console.error(`Error looking up 'srcSet="[^"]*"' in ${file}`, error);
    }
  }
};

export const updateImgSrcValues = async (file: string) => {
  try {
    const out1 = (await $`grep -o 'src="[^"]*' ${file}`).stdout;
    const lines1 = out1.trim().split("\n");
    await rewriteImgSrc(lines1, file);
  } catch (error: any) {
    if (error.exitCode === 1 && error.stdout == "" && error.stderr == "") {
      console.error(`${file} does not contain 'src="[^"]*'`);
    } else {
      console.error(`Error looking up 'src="[^"]*' in ${file}`, error);
    }
  }
};
