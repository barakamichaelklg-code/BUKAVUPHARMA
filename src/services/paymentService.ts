export type MobileNetwork = 'mpesa' | 'airtel' | 'orange';

export interface PaymentRequest {
  network: MobileNetwork;
  phoneNumber: string;
  amount: number;
  currency: string;
  merchantId?: string; // ID of the pharmacy or company
  orderId: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  status?: 'pending' | 'completed' | 'failed';
  message: string;
}

/**
 * Service pour intégrer les paiements Mobile Money (Orange, Airtel, M-Pesa).
 * En production, ces appels doivent être faits depuis un backend sécurisé pour protéger les clés d'API.
 */
export const paymentService = {
  /**
   * Initie un paiement Mobile Money
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    console.log(`Initiating ${request.network} payment for order ${request.orderId}...`);
    
    // Remplacez par votre véritable URL d'API de paiement (ex: FlexPay, MaxiCash, ou l'API directe de l'opérateur)
    const API_URL = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.example-payment-gateway.com/v1/charge';
    const API_KEY = import.meta.env.VITE_PAYMENT_API_KEY;

    try {
      /* 
      // Décommentez et adaptez ce code en production
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          network: request.network,
          phone: request.phoneNumber,
          amount: request.amount,
          currency: request.currency,
          reference: request.orderId,
          merchant_account: request.merchantId 
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la communication avec l\'API de paiement');
      }

      const data = await response.json();
      return {
        success: data.success,
        transactionId: data.transaction_id,
        status: data.status,
        message: data.message
      };
      */

      // --- SIMULATION POUR LE DÉVELOPPEMENT ---
      // Nous simulons un délai d'attente de l'API (ex: le client saisit son code PIN sur son téléphone)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return {
        success: true,
        transactionId: `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        status: 'completed',
        message: `Paiement ${request.network.toUpperCase()} traité avec succès.`
      };

    } catch (error) {
      console.error("Erreur de paiement:", error);
      return {
        success: false,
        status: 'failed',
        message: 'Échec de la transaction. Veuillez réessayer.'
      };
    }
  }
};
