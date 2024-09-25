import { Command } from "commander";
import { cloneWebsite, prepareStaticExport } from "./tasks";

const program = new Command();

program
  .name("devcon-static-exporter")
  .description("CLI tool to build an optimized static export of devcon app frontend")
  .version("1.0.0");

program
  .command("clone")
  .description("Clone the website devcon.org using httrack")
  .action(async () => {
    await cloneWebsite();
  });

program
  .command("clone-fresh")
  .description(
    "Deletes existing folder and clones the website devcon.org using httrack"
  )
  .action(async () => {
    await cloneWebsite(true);
  });
program
  .command("make-static")
  .description(
    "Fetch all dynamic next/image URLs and rewrite to use optimized images"
  )
  .action(async () => {
    await prepareStaticExport();
  });

program.parse(process.argv);
