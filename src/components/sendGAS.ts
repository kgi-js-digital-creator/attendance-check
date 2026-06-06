interface GasResponse {
  success?: boolean;
  message?: string;
  user_info?: {
    id?: string | number;
    name?: string;
    message?: string;
  };
}

export default async function sendGAS(id: string, name: string) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const gasUrl = urlParams.get("gas");
    const spreadsheetUrl = urlParams.get("spreadsheet");

    if (!gasUrl) {
      throw new Error("GAS URL is not specified (URL param 'gas' is missing).");
    }
    if (!spreadsheetUrl) {
      throw new Error(
        "Spreadsheet URL is not specified (URL param 'spreadsheet' is missing).",
      );
    }

    const data = {
      method: "Attend",
      body: {
        url: spreadsheetUrl,
        id: id,
        name: name,
      },
    };
    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(
        `Can't post login data: ${res.status}: ${res.statusText}`,
      );
    }
    const gasData = (await res.json()) as GasResponse;

    const isSuccess = gasData.success;
    const isAlready = gasData.message == "already registered";

    const userInfo = gasData.user_info || {};
    const userId = userInfo.id;
    const userName = userInfo.name;
    const registeredTime = userInfo.message;

    return {
      success: true,
      gas_status: isSuccess,
      isAlready: isAlready,
      registeredTime: registeredTime,
      user: {
        id: userId,
        name: userName,
      },
    };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}
