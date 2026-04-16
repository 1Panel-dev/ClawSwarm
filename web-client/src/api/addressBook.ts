import { apiClient } from "@/api/client";
import type { AddressBookResponse } from "@/types/api/addressBook";
import type { AddressBookOutput } from "@/types/view/addressBook";
import { camelizeKeys } from "@/utils/case";

export async function fetchAddressBook(): Promise<AddressBookOutput> {
    const response = await apiClient.get<AddressBookResponse>("/api/address-book");
    return camelizeKeys(response.data);
}
