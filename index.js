const { google } = require('googleapis');
const { Auth } = require('google-auth-library');
const puppeteer = require('puppeteer');

// Set up Google Cloud Monitoring client
const auth = new Auth();
const monitoring = google.monitoring('v3');
const authClient = await auth.getClient();

// Define URLs to monitor
const urls = [
  {
    url: 'https://assurx.ikshealth.com',
    username: 'Vaishnavi.Thigale',
    password: 'wart123'
  },
  // Add more URLs as needed
];

async function monitorUrl(urlConfig) {
  const { url, username, password } = urlConfig;
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  // Perform login
  await page.type('input[name="username"]', username);
  await page.type('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation();

  // Measure page load time
  const loadTime = await page.evaluate(() => {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    return navigationEntry ? navigationEntry.loadEventEnd - navigationEntry.navigationStart : -1;
  });

  await browser.close();
  return loadTime;
}

async function main() {
  try {
    const projectId = await auth.getProjectId();
    const formattedProjectName = `projects/${projectId}`;
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    const promises = urls.map(async (urlConfig) => {
      const loadTime = await monitorUrl(urlConfig);
      console.log(`Page ${urlConfig.url} loaded in ${loadTime}ms`);
      
      // Send custom metric to Google Cloud Monitoring
      const request = {
        name: formattedProjectName,
        resource: {
          type: 'global',
          labels: {
            project_id: projectId,
            metric: 'custom.googleapis.com/page_load_time',
            url: urlConfig.url,
          },
          metricKind: 'GAUGE',
          valueType: 'DOUBLE',
          points: [{
            interval: {
              endTime: new Date().toISOString(),
            },
            value: loadTime,
          }],
        },
      };
      await monitoring.projects.timeSeries.create(request);
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
