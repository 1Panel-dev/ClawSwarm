import { apiClient } from "@/api/client";
import type { AddressBookResponseApi } from "@/types/api/addressBook";

export async function fetchAddressBook(): Promise<AddressBookResponseApi> {
    const response = await apiClient.get<AddressBookResponseApi>("/api/address-book");
    return response.data;
}
