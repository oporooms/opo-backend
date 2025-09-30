import axios from "axios";
// retry-axios exports functions on the module object (no default export). Using a namespace import
// ensures rax.attach / rax.getConfig are defined under NodeNext + esModuleInterop.
import * as rax from "retry-axios";

// Create a shared axios instance with retry/backoff configuration
const axiosClient = axios.create({
  timeout: 30_000,
});

// Configure retry-axios: exponential backoff, retry on network errors and 5xx
rax.attach(axiosClient);
// Cast to any to satisfy retry-axios typings mismatch with Axios 1.x
(axiosClient.defaults as any).raxConfig = {
  instance: axiosClient,
  retry: 3,
  noResponseRetries: 2,
  retryDelay: 500,
  backoffType: 'exponential',
  httpMethodsToRetry: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT', 'POST'],
  statusCodesToRetry: [[100, 199], [429, 429], [500, 599]],
  onRetryAttempt: (err: any) => {
    const cfg = rax.getConfig(err);
    console.warn(`BDSD API retry #${cfg?.currentRetryAttempt}`);
  },
};

// Generic helper to call BDSD flight API endpoints with required credentials
// Pulls Username and Password from environment variables
const bdsdApi = async <Params, Response, Error = Response>(
  url: string,
  data: Params
) => {
  console.log("username", process.env.BDSD_USERNAME)
  console.log("password", process.env.BDSD_PASSWORD)
  try {
    const response = await axiosClient.post(url, data, {
      headers: {
        Username: process.env.BDSD_USERNAME,
        Password: process.env.BDSD_PASSWORD,
      },
      // Allow per-call override by setting raxConfig if needed
    });

    if (response.status === 200) {
      return response.data as Response;
    } else {
      return {
        Error: {
          ErrorCode: 1,
          ErrorMessage: "No Data Found",
        },
      } as Error;
    }
  } catch (error) {
    console.error("Error in BDSD API call:", error);
    return {
      Error: {
        ErrorCode: 1,
        ErrorMessage: "Something went wrong",
      },
    } as Error;
  }
};

export default bdsdApi;
