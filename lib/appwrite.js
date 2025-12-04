import { Client, Databases } from "react-native-appwrite";
import Constants from "expo-constants";
const { APPWRITE_ENDPOINT, APPWRITE_PROJECT } = Constants.expoConfig.extra;

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT);

const databases = new Databases(client);

export { client, databases };
