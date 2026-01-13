<?php
/**
 * SIGNAL CRM - Brevo Mailer
 * 
 * Klasa za slanje emailova preko Brevo API-ja
 */

require_once __DIR__ . '/config.php';

class BrevoMailer {
    private $apiKey;
    private $apiUrl;
    private $lastError;
    private $lastResponse;
    
    public function __construct($apiKey = null) {
        $this->apiKey = $apiKey ?? BREVO_API_KEY;
        $this->apiUrl = BREVO_API_URL;
    }
    
    /**
     * Pošalji pojedinačni email
     */
    public function send($to, $subject, $htmlContent, $options = []) {
        $data = [
            'sender' => [
                'name' => $options['senderName'] ?? DEFAULT_SENDER_NAME,
                'email' => $options['senderEmail'] ?? DEFAULT_SENDER_EMAIL
            ],
            'to' => [
                [
                    'email' => is_array($to) ? $to['email'] : $to,
                    'name' => is_array($to) ? ($to['name'] ?? '') : ''
                ]
            ],
            'subject' => $subject,
            'htmlContent' => $htmlContent
        ];
        
        // Reply-to
        if (isset($options['replyTo'])) {
            $data['replyTo'] = $options['replyTo'];
        }
        
        // Tagovi za tracking
        if (isset($options['tags'])) {
            $data['tags'] = $options['tags'];
        }
        
        // Attachments
        if (isset($options['attachments'])) {
            $data['attachment'] = $options['attachments'];
        }
        
        // Template params (za Brevo templates)
        if (isset($options['params'])) {
            $data['params'] = $options['params'];
        }
        
        return $this->makeRequest('/smtp/email', 'POST', $data);
    }
    
    /**
     * Pošalji koristeći Brevo template
     */
    public function sendTemplate($to, $templateId, $params = [], $options = []) {
        $data = [
            'to' => [
                [
                    'email' => is_array($to) ? $to['email'] : $to,
                    'name' => is_array($to) ? ($to['name'] ?? '') : ''
                ]
            ],
            'templateId' => (int)$templateId,
            'params' => $params
        ];
        
        if (isset($options['replyTo'])) {
            $data['replyTo'] = $options['replyTo'];
        }
        
        return $this->makeRequest('/smtp/email', 'POST', $data);
    }
    
    /**
     * Bulk slanje (do 100 primatelja)
     */
    public function sendBulk($recipients, $subject, $htmlTemplate, $options = []) {
        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        foreach ($recipients as $recipient) {
            // Personaliziraj template
            $html = $this->personalize($htmlTemplate, $recipient);
            $personalizedSubject = $this->personalize($subject, $recipient);
            
            $result = $this->send(
                ['email' => $recipient['email'], 'name' => $recipient['name'] ?? ''],
                $personalizedSubject,
                $html,
                $options
            );
            
            if ($result['success']) {
                $results['success']++;
            } else {
                $results['failed']++;
                $results['errors'][] = [
                    'email' => $recipient['email'],
                    'error' => $result['error'] ?? 'Unknown error'
                ];
            }
            
            // Rate limiting - pauza između mailova
            usleep(($options['delay'] ?? 100) * 1000);
        }
        
        return $results;
    }
    
    /**
     * Kreiraj kampanju u Brevu
     */
    public function createCampaign($name, $subject, $htmlContent, $listIds, $options = []) {
        $data = [
            'name' => $name,
            'subject' => $subject,
            'sender' => [
                'name' => $options['senderName'] ?? DEFAULT_SENDER_NAME,
                'email' => $options['senderEmail'] ?? DEFAULT_SENDER_EMAIL
            ],
            'type' => 'classic',
            'htmlContent' => $htmlContent,
            'recipients' => ['listIds' => $listIds]
        ];
        
        // Scheduled sending
        if (isset($options['scheduledAt'])) {
            $data['scheduledAt'] = $options['scheduledAt'];
        }
        
        // Reply-to
        if (isset($options['replyTo'])) {
            $data['replyTo'] = $options['replyTo'];
        }
        
        return $this->makeRequest('/emailCampaigns', 'POST', $data);
    }
    
    /**
     * Pošalji kampanju
     */
    public function sendCampaign($campaignId) {
        return $this->makeRequest("/emailCampaigns/{$campaignId}/sendNow", 'POST');
    }
    
    /**
     * Dohvati statistike kampanje
     */
    public function getCampaignStats($campaignId) {
        return $this->makeRequest("/emailCampaigns/{$campaignId}");
    }
    
    /**
     * Dodaj kontakt u Brevo
     */
    public function createContact($email, $attributes = [], $listIds = []) {
        $data = [
            'email' => $email,
            'attributes' => $attributes,
            'updateEnabled' => true
        ];
        
        if (!empty($listIds)) {
            $data['listIds'] = $listIds;
        }
        
        return $this->makeRequest('/contacts', 'POST', $data);
    }
    
    /**
     * Ažuriraj kontakt
     */
    public function updateContact($email, $attributes = []) {
        $data = ['attributes' => $attributes];
        $encodedEmail = urlencode($email);
        return $this->makeRequest("/contacts/{$encodedEmail}", 'PUT', $data);
    }
    
    /**
     * Dohvati kontakt
     */
    public function getContact($email) {
        $encodedEmail = urlencode($email);
        return $this->makeRequest("/contacts/{$encodedEmail}");
    }
    
    /**
     * Dohvati sve kontakte (paginirano)
     */
    public function getContacts($limit = 50, $offset = 0) {
        return $this->makeRequest("/contacts?limit={$limit}&offset={$offset}");
    }
    
    /**
     * Dohvati liste
     */
    public function getLists() {
        return $this->makeRequest('/contacts/lists');
    }
    
    /**
     * Personaliziraj template
     */
    private function personalize($template, $data) {
        foreach ($data as $key => $value) {
            if (is_string($value) || is_numeric($value)) {
                $template = str_replace('{{' . $key . '}}', $value, $template);
                $template = str_replace('{{ ' . $key . ' }}', $value, $template);
            }
        }
        return $template;
    }
    
    /**
     * API request
     */
    private function makeRequest($endpoint, $method = 'GET', $data = null) {
        $url = $this->apiUrl . $endpoint;
        
        $ch = curl_init();
        
        $headers = [
            'accept: application/json',
            'api-key: ' . $this->apiKey,
            'content-type: application/json'
        ];
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30
        ]);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        } elseif ($method === 'PUT') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        $this->lastResponse = $response;
        
        if ($curlError) {
            $this->lastError = $curlError;
            return ['success' => false, 'error' => $curlError];
        }
        
        $decoded = json_decode($response, true);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            return [
                'success' => true,
                'data' => $decoded,
                'httpCode' => $httpCode
            ];
        } else {
            $error = $decoded['message'] ?? $decoded['error'] ?? 'Unknown error';
            $this->lastError = $error;
            return [
                'success' => false,
                'error' => $error,
                'httpCode' => $httpCode,
                'data' => $decoded
            ];
        }
    }
    
    /**
     * Dohvati zadnju grešku
     */
    public function getLastError() {
        return $this->lastError;
    }
    
    /**
     * Dohvati zadnji response
     */
    public function getLastResponse() {
        return $this->lastResponse;
    }
    
    /**
     * Test konekcije
     */
    public function testConnection() {
        $result = $this->makeRequest('/account');
        return $result['success'];
    }
}

// =====================================================
// HELPER FUNKCIJE
// =====================================================

/**
 * Pošalji email iz CRM-a i logiraj
 */
function sendCrmEmail($firmaId, $kontaktId, $subject, $htmlContent, $options = []) {
    $pdo = getDB();
    $mailer = new BrevoMailer();
    
    // Dohvati podatke o firmi/kontaktu
    if ($kontaktId) {
        $stmt = $pdo->prepare("
            SELECT k.*, f.naziv as firma_naziv 
            FROM kontakti k 
            JOIN firme f ON k.firma_id = f.id 
            WHERE k.id = ?
        ");
        $stmt->execute([$kontaktId]);
        $recipient = $stmt->fetch();
    } else {
        $stmt = $pdo->prepare("SELECT * FROM firme WHERE id = ?");
        $stmt->execute([$firmaId]);
        $recipient = $stmt->fetch();
    }
    
    if (!$recipient || empty($recipient['email'])) {
        return ['success' => false, 'error' => 'Nema email adrese'];
    }
    
    // Personaliziraj
    $replacements = [
        'ime' => $recipient['ime'] ?? '',
        'prezime' => $recipient['prezime'] ?? '',
        'firma' => $recipient['firma_naziv'] ?? $recipient['naziv'] ?? '',
        'email' => $recipient['email']
    ];
    
    foreach ($replacements as $key => $value) {
        $htmlContent = str_replace('{{' . $key . '}}', $value, $htmlContent);
        $subject = str_replace('{{' . $key . '}}', $value, $subject);
    }
    
    // Pošalji
    $result = $mailer->send(
        ['email' => $recipient['email'], 'name' => trim(($recipient['ime'] ?? '') . ' ' . ($recipient['prezime'] ?? ''))],
        $subject,
        $htmlContent,
        $options
    );
    
    // Logiraj
    $stmt = $pdo->prepare("
        INSERT INTO email_log (firma_id, kontakt_id, recipient_email, recipient_name, subject, status, brevo_message_id, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $firmaId,
        $kontaktId,
        $recipient['email'],
        trim(($recipient['ime'] ?? '') . ' ' . ($recipient['prezime'] ?? '')),
        $subject,
        $result['success'] ? 'sent' : 'failed',
        $result['data']['messageId'] ?? null
    ]);
    
    return $result;
}
