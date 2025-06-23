export function trimStrDotted(str, length) {
  if (str.length > length) {
    return str.substring(0, length) + "...";
  } else {
    return str;
  }
}
export function trimStr(str, length) {
  return str.length > length ? `${str.slice(0, length)}` : str;
}
export function checkEmail(email) {
  // Checking if email is a work email and not from a free domain
  const freeDomains = [
    // 'gmail.com',
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "mail.ru",
    "aol.com",
    "ymail.com",
    "zoho.com",
    // 'yandex.com',
    // 'protonmail.com',
    "tutanota.com",
    "gmx.com",
    "live.com",
    "inbox.com",
    "hotmail.fr",
    "hotmail.de",
    "hotmail.co.uk",
    "hotmail.it",
    "live.fr",
    "live.de",
    "live.co.uk",
    "live.it",
    "outlook.fr",
    "outlook.de",
    "outlook.co.uk",
    "outlook.it",
    "msn.com",
    "yahoo.fr",
    "yahoo.de",
    "yahoo.co.uk",
    "yahoo.it",
    "icloud.com",
    "mac.com",
    "me.com",
    "icloud.com",
    "mac.com",
    "me.com",
  ];
  const emailParts = email.split("@");
  const domain = emailParts[1];
  return !freeDomains.includes(domain);
}

export const createSandbox = (code) => {
  // Create a sandbox for testing the code
  // Create a secure iframe if we're using sandboxed mode
  const sandboxed = true;
  if (sandboxed) {
    const sandbox = document.createElement("iframe");
    sandbox.style.display = "none";
    sandbox.sandbox = "allow-scripts";
    document.body.appendChild(sandbox);

    const cleanupSandbox = () => {
      if (sandbox.parentNode) {
        document.body.removeChild(sandbox);
      }
    };

    return {
      execute: (
        context,
        prevResult,
        newCode = undefined, // used to call createSandbox multiple times instead of recreating it every time
        doCleanup = true,
      ) => {
        return new Promise((resolve, reject) => {
          // Set up message listener for sandbox communication
          const messageHandler = (event) => {
            // Filter events we don't want to listen
            if (
              !event.data ||
              (!("result" in event.data) && !("error" in event.data))
            ) {
              return;
            }
            window.removeEventListener("message", messageHandler);
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data);
            }
            if (doCleanup) {
              cleanupSandbox();
            }
          };

          window.addEventListener("message", messageHandler);

          // Inject code into sandbox with proper isolation
          const sandboxContent = `
              <script>
                // Create an array to collect logs
                var logs = [];
                // Save the original console.log
                var originalLog = console.log;
                // Override console.log to capture logs and call the original function
                console.log = function(...args) {
                  // Convert each argument to a string representation
  
                  var logStr = args.map(arg => {
                    if (typeof arg === "object") {
                      try {
                        return JSON.stringify(arg);
                      } catch(e) {
                        return String(arg);
                      }
                    } else {
                      return String(arg);
                    }
                  }).join(" ");
                  logs.push(logStr);
                  originalLog.apply(console, args);
                }
                try {
  
                  // Create isolated function scope
                  const context = ${JSON.stringify(context)};
                  let previousResult;
                  try {
                    previousResult = JSON.parse('${JSON.stringify(prevResult)}');
                  } catch (e) {
                    previousResult = {};
                  }
                  
                  // Execute user code in a safe way
                  const userFunction = (function() {
                    ${newCode ? newCode : code}
                  })();
                  
                  // Test by calling the function
                  const result = userFunction(context, previousResult);
                  
                  // Send result back to parent
                  window.parent.postMessage({ result: result, logs: logs }, '*');
                } catch (error) {
                  // Send errors back to parent
                  window.parent.postMessage({ error: error.message, logs: logs }, '*');
                }
              </script>
            `;

          sandbox.srcdoc = sandboxContent;
        });
      },
      cleanup: cleanupSandbox,
    };
  } else {
    // If not sandboxed, execute directly with a Function constructor (still safer than eval)
    return {
      execute: (context) => {
        return new Promise((resolve, reject) => {
          try {
            // Create isolated function with limited scope
            const userFunction = new Function(`
                const context = ${JSON.stringify(context)};
                ${code}
              `)();

            const result = userFunction(context);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      },
      cleanup: () => {},
    };
  }
};
