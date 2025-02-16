require("dotenv").config();
const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { solve } = require("recaptcha-solver");

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/**
 * Scrapes TikTok profile to get followers, total posts, likes, views, and engagement ratio.
 */
async function scrapeTikTok(username) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-web-security",
        ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    const profileUrl = `https://www.tiktok.com/@${username}`;
    console.log(`Navigating to: ${profileUrl}`);

    await page.setRequestInterception(true);
page.on('request', (req) => {
  if (req.isNavigationRequest() && req.url().includes('login')) {
    req.abort();
    console.log('Blocked Instagram login page');
  } else {
    req.continue();
  }
});

    await page.goto(profileUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Extract profile stats AFTER scrolling has finished
    const { handle, followers, likes, profilePic } = await page.evaluate(() => {
        function parseNumber(str) {
            if (!str) return 0;
            const number = parseFloat(str.replace(/[^\d.]/g, "")) *
                (str.includes("k") ? 1000 : str.includes("M") ? 1000000 : 1);
            return number.toLocaleString();
        }

        return {
            handle: document.querySelector("h1")?.innerText.trim() || "N/A",
            followers: parseNumber(document.querySelector('[data-e2e="followers-count"]')?.innerText || "0"),
            likes: parseNumber(document.querySelector('[data-e2e="likes-count"]')?.innerText || "0"),
            profilePic: document.querySelector('img[class*="ImgAvatar"]')?.getAttribute('src') || 'N/A'
        };
    });


    console.log(`Scraped: Handle - ${handle}, Followers - ${followers}, Likes - ${likes}, Profile Pic- ${profilePic}`);

    await browser.close();

    return {
        platform: "TikTok",
        handle,
        profileUrl,
        followers,
        totalLikes: likes,
        profilePic
    };
}

/**
 * Scrapes Instagram profile to get followers, total posts, likes, and engagement ratio.
 */
async function scrapeInstagram(username) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    const profileUrl = `https://www.instagram.com/${username}/`;
    console.log(`Navigating to: ${profileUrl}`);

    await page.setRequestInterception(true);
page.on('request', (req) => {
  if (req.isNavigationRequest() && req.url().includes('login')) {
    req.abort();
    console.log('Blocked Instagram login page');
  } else {
    req.continue();
  }
});

    await page.goto(profileUrl, { waitUntil: "networkidle2" });

    await page.waitForSelector('meta[property="og:description"]', { timeout: 10000 });

    const profileData = await page.evaluate(() => {
        function parseNumber(str) {
            if (!str) return 0;
            const num = parseFloat(str.replace(/[^\d.]/g, ''));
            if (str.includes('M')) return (num * 1_000_000).toLocaleString();
            if (str.includes('K')) return (num * 1_000).toLocaleString();
            return num.toLocaleString();;
        }


        const profilePic = document.querySelector('img[alt*="profile picture"]')?.getAttribute('src') || 'N/A';
    
        const followers = parseNumber(
            document.querySelector('meta[property="og:description"]')?.content.match(/(\d+(\.\d+)?[MK]?) Followers/)?.[0] || "0"
        );
    
        const posts = parseNumber(
            document.querySelector('meta[property="og:description"]')?.content.match(/(\d+(\.\d+)?[MK]?) Posts/)?.[0] || "0"
        );
    
        return { followers, posts, profilePic };
    });

    console.log(`Scraped: Handle - ${username}, Followers - ${profileData.followers}, Posts - ${profileData.posts}, Profile Pic - ${profileData.profilePic}`);

    await browser.close();

    return {
        platform: "Instagram",
        handle: username,
        profileUrl,
        followers: profileData.followers,
        totalPosts: profileData.posts,
        profilePic: profileData.profilePic
    };
}

    async function scrapeSpotify(url) {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
      
        const data = await page.evaluate(() => {
          const name = document.querySelector('h1[data-testid="entityTitle"]')?.innerText || 'N/A';
          const monthlyListeners = document.querySelector('span[class*="monthly listeners"]')?.innerText || 'N/A';
      
          const topTracks = Array.from(document.querySelectorAll('div[role="gridcell"][aria-colindex="3"] div[data-encore-id="text"]')).map(el => {
            const streams = el.innerText || 'N/A';
            const trackName = el.closest('div[role="row"]')?.querySelector('a[data-testid="internal-track-link"]')?.innerText || 'N/A';
            return { trackName, streams };
          });
      
          return { name, monthlyListeners, topTracks };
        });
      
        await browser.close();
        return data;
      }

      async function scrapeModashInstaEngagement(username) {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        const url = `https://www.modash.io/engagement-rate-calculator?influencer=%40${username}`;
      
        console.log(`Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });
      
        const data = await page.evaluate(() => {
          const elements = document.querySelectorAll('div[class*="cardValue"] span');
          console.log('Elements found:', elements.length);
          if (elements.length > 0) {
            console.log('Engagement rate element:', elements[0].innerText);
          }
          const engagementRate = elements[0]?.innerText || 'N/A';
          return { engagementRate };
        });
      
        console.log('Scraped Data:', data);
        await browser.close();
        return data;
      }

      async function scrapeModashTiktokEngagement(username) {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        const url = `https://www.modash.io/tiktok-engagement-rate-calculator?influencer=%40${username}`;
      
        console.log(`Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });
      
        const data = await page.evaluate(() => {
          const elements = document.querySelectorAll('div[class*="cardValue"] span');
          console.log('Elements found:', elements.length);
          if (elements.length > 0) {
            console.log('Engagement rate element:', elements[0].innerText);
          }
          const engagementRate = elements[0]?.innerText || 'N/A';
          return { engagementRate };
        });
      
        console.log('Scraped Data:', data);
        await browser.close();
        return data;
      }
      
      
      // Express route to scrape Spotify page
      app.get('/spotify/scrape', async (req, res) => {
        const { url } = req.query;
        try {
          const data = await scrapeSpotify(url);
          res.json(data);
        } catch (error) {
          console.error('Error scraping Spotify:', error);
          res.status(500).json({ error: 'Failed to scrape Spotify' });
        }
      });

  /**
 * Express Route: Get TikTok Data
 */
app.get("/scrape/basic/tiktok/:username", async (req, res) => {
    const { username } = req.params;
    try {
        const data = await scrapeTikTok(username);
        const engagement = await scrapeModashTiktokEngagement(username);
        res.json({data, engagement});
    } catch (error) {
        console.error("Error scraping TikTok:", error);
        res.status(500).json({ error: "Failed to scrape TikTok." });
    }
});

/**
 * Express Route: Get Instagram Data
 */
app.get("/scrape/basic/instagram/:username", async (req, res) => {
    const { username } = req.params;
    try {
        const data = await scrapeInstagram(username);
        const engagement = await scrapeModashInstaEngagement(username);
        res.json({data, engagement});
    } catch (error) {
        console.error("Error scraping Instagram:", error);
        res.status(500).json({ error: "Failed to scrape Instagram." });
    }
});

/**
 * Start Express Server
 */
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
