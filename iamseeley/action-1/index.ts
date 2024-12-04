import { nodes, state } from 'membrane';


export const Root = {
  async testClockAndProcess() {
    console.log("Starting Clock and Process test");
    try {
      // Test clock.sleep
      console.log("Testing clock.sleep");
      const sleepStart = Date.now();
      await nodes.clock.sleep({ seconds: 2 });
      const sleepEnd = Date.now();
      console.log(`Slept for approximately ${(sleepEnd - sleepStart) / 1000} seconds`);
      // Test clock.timer
      console.log("Testing clock.timer");
      let timerCount = 0;
      await nodes.clock.timer({
        key: "testTimer",
        spec: "*/2 * * * * *", // Every 2 seconds
        action: () => {
          timerCount++;
          console.log(`Timer fired ${timerCount} time(s)`);
          if (timerCount >= 3) {
            // We'll cancel this timer after 3 fires
            nodes.clock.timer({ key: "testTimer", action: "cancel" });
          }
        }
      });
      console.log("Timer set up");

      // Test clock.timerAt
      console.log("Testing clock.timerAt");
      try {
        const secondsFromNow = 5; // 5 seconds from now
        console.log(`Attempting to schedule timerAt for ${secondsFromNow} seconds from now`);
        await nodes.clock.timerAt({
          key: "futureEvent",
          seconds: secondsFromNow,
          action: () => console.log("Future event occurred!")
        });
        console.log("timerAt scheduled successfully");
      } catch (timerAtError) {
        console.error("Error in clock.timerAt:", timerAtError);
        console.log("timerAt method signature:", nodes.clock.timerAt.toString());
      }

      // Test process.endpointUrl
      console.log("Testing process.endpointUrl");
      const endpointUrl = await nodes.process.endpointUrl;
      console.log(`Program endpoint URL: ${endpointUrl}`);

      // Wait for timers to complete
      console.log("Waiting for timers to complete...");
      await nodes.clock.sleep({ seconds: 10 });
      console.log("Clock and Process test completed");

      // Return a summary of operations
      return {
        sleepDuration: (sleepEnd - sleepStart) / 1000,
        timerFiredCount: timerCount,
        endpointUrl
      };
    } catch (error) {
      console.error("An error occurred during the test:", error);
      return { error: error.message, stack: error.stack };
    }
  },
};