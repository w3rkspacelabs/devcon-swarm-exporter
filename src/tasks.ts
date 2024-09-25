import { fs } from "zx";
import {
  cleanupDirectory,
  downloadMissingCacheFiles,
  downloadMissingChunks,
  fetchNextjsImages,
  updateImageSrcSetValues,
  updateImgSrcValues,
  updateJsFiles,
  downloadNextDataFiles,
  execCommand,
  downloadCssUrls,
  addIndex,
  removeHtmlComments,
} from "./utils";
import { DevconFolder, WebsiteUrls } from "./config";
import { green } from "picocolors";

export const cloneWebsite = async (fresh = false) => {
  if (fresh) {
    fs.rmSync(DevconFolder, { recursive: true, force: true });
  }
  if (!fs.existsSync(DevconFolder)) {
    try {
      fs.mkdirSync(DevconFolder, { recursive: true });
      console.log(
        `Cloning website ${WebsiteUrls.join(" ")} to ${DevconFolder}...`
      );
      const command = "httrack";
      let args = [
        WebsiteUrls[0],
        WebsiteUrls[1],
        "-O",
        DevconFolder,
        "-N100",
        "-I0",
        "--near",
        "-v",
      ];
      try {
        const exitCode = await execCommand(command, args);
        console.log(`httrack exited with code ${exitCode}`);
      } catch (error) {
        console.error(`Error executing command: ${error}`);
      }
      console.log(
        `Website ${WebsiteUrls.join(
          " "
        )} cloned successfully to ${DevconFolder}.`
      );
    } catch (error) {
      console.error("Error cloning website:", error);
    }
  } else {
    console.log(`${green(DevconFolder)} folder already exixts`);
  }
};

export const prepareStaticExport = async () => {
  await cleanupDirectory();
  await removeHtmlComments();
  await downloadMissingCacheFiles();
  await downloadMissingChunks();
  await downloadNextDataFiles();
  await downloadCssUrls();

  await updateJsFiles();
  const files = (await fetchNextjsImages()) || [];
  for (const file of files) {
    await updateImageSrcSetValues(file);
    await updateImgSrcValues(file);
  }
  addIndex();
};
