const puppeteer = require("puppeteer");
const { createHash } = require("node:crypto");
const querystring = require("node:querystring");
require("dotenv").config();
const axios = require("axios");

const bbb = {
  url: process.env.BBB_URL,
  secret: process.env.BBB_SECRET,
};

const options = {
  headless: true,
  //executablePath for mac
  args: [
    "--disable-infobars",
    "--no-sandbox",
    "--disable-notifications",
    `--use-fake-device-for-media-stream`,
    `--use-fake-ui-for-media-stream`,
    "--use-file-for-fake-video-capture=./fake.mjpeg",
    "--use-file-for-fake-audio-capture=./fake.wav",
    // "--app=https://www.google.com/",
  ],
};

const generateChecksum = (action, paramString) => {
  const checksum = createHash("sha1")
    .update(`${action}${paramString}${bbb.secret}`)
    .digest("hex");
  return checksum;
};

const joinMeeting = async (meetingId, username) => {
  const params = {
    meetingID: process.env.BBB_MEETING_ID,
    fullName: username,
    role: "MODERATOR",
    "userdata-bbb_auto_join_audio": true,
    "userdata-bbb_listen_only_mode": false,
    "userdata-bbb_skip_check_audio": true,
    "userdata-bbb_auto_share_webcam": true,
    "userdata-bbb_skip_video_preview": true,
  };
  const paramString = querystring.stringify(params);
  const checksum = generateChecksum("join", paramString);
  const url = `${bbb.url}/bigbluebutton/api/join?${paramString}&checksum=${checksum}`;
  console.log(url);
  return url;
};

const createBigBlueButtonMeeting = async () => {
  const params = {
    meetingID: process.env.BBB_MEETING_ID,
    name: "Test",
  };
  const apiName = "create";

  const paramString = querystring.stringify(params);
  const checksum = generateChecksum(apiName, paramString);
  const url = `${bbb.url}/bigbluebutton/api/${apiName}?${paramString}&checksum=${checksum}`;
  await axios.get(url);
};

const main = async () => {
  try {
    let browser = await puppeteer.launch(options);

    await createBigBlueButtonMeeting();
    const joinUrl = await joinMeeting("random-1919952", "test");

    // open join url in  5 new tabs
    for (let i = 0; i < 2; i++) {
      const page = await browser.newPage();
      await page.goto(joinUrl, { waitUntil: "networkidle2" });
    }

    // close browser on ctrl+c
    process.on("SIGINT", async () => {
      await browser.close();
      process.exit();
    });

    // exit code if browser closes
    browser.on("disconnected", () => {
      process.exit();
    });

    // kill process after 20 seconds
    setTimeout(async () => {
      await browser.close();
      process.exit();
    }, 200000);
  } catch (err) {
    console.error(err);
  }
};

main();
