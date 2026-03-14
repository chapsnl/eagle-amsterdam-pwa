import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TicketsoftTicket {
  uuid: string;
  name: string;
  description: string;
  price: string;
  availableTickets: number;
  remainingTickets: number;
  minTickets: number;
  maxTickets: number;
  saleStart: string;
  saleEnd: string;
  type: string;
  visible: boolean;
}

export interface TicketsoftEvent {
  id: number;
  uuid: string;
  name: string;
  description: string;
  shopUrl: string;
  eligibleForSelling: boolean;
  details: {
    start: string;
    end: string;
  };
  location: {
    name: string;
    street: string;
    houseNumber: string;
    postcode: string;
    city: string;
  };
  brand: {
    backgroundImageUrl: string;
    logoUrl: string;
  };
  tickets: TicketsoftTicket[];
}

export function useTicketsoftEvents() {
  return useQuery<TicketsoftEvent[]>({
    queryKey: ["ticketsoft-events"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "fetch-ticketsoft-events"
      );
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as TicketsoftEvent[];
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
