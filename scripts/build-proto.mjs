// This script is specifically for fetching the latest proto

import { writeFileSync, mkdirSync, existsSync } from "node:fs";

// import "";

// import {  } from "node:fs";

const res = await fetch("https://raw.githubusercontent.com/PixelWalkerGame/Protocol/refs/heads/new/world.proto");

// console.log(res);

if (res.status !== 200) throw Error("Unable to fetch the latest proto file.");

if (!existsSync("./input")) mkdirSync("./input");

res.bytes()
    .then(v => writeFileSync("./input/world.proto", v));