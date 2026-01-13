<?php
/**
 * API Modul: Email (Brevo)
 */

requireAuth();

switch ($endpoint) {
    case 'send-email':
        if ($method !== 'POST') sendResponse(false, null, 'Metoda nije dozvoljena');
        
        $firmaId = $input['firma_id'] ?? null;
        $kontaktId = $input['kontakt_id'] ?? null;
        $subject = $input['subject'] ?? '';
        $body = $input['body'] ?? '';
        $servisSlug = $input['servis'] ?? null;
        
        $options = [];
        if ($servisSlug) {
            global $EMAIL_SENDERS;
            if (isset($EMAIL_SENDERS[$servisSlug])) {
                $options['senderEmail'] = $EMAIL_SENDERS[$servisSlug]['email'];
                $options['senderName'] = $EMAIL_SENDERS[$servisSlug]['name'];
            }
        }
        
        $result = sendCrmEmail($firmaId, $kontaktId, $subject, $body, $options);
        sendResponse($result['success'], $result['data'] ?? null, $result['error'] ?? null);
        break;
        
    case 'kampanje':
        if ($method === 'GET') {
            $kampanje = $pdo->query("
                SELECT k.*, s.naziv AS servis_naziv
                FROM email_kampanje k
                LEFT JOIN servisi s ON k.servis_id = s.id
                ORDER BY k.created_at DESC
            ")->fetchAll();
            sendResponse(true, $kampanje);
            
        } elseif ($method === 'POST') {
            $data = [
                'naziv' => $input['naziv'],
                'servis_id' => $input['servis_id'] ?? null,
                'subject' => $input['subject'],
                'body' => $input['body'],
                'status' => 'draft',
                'created_by' => $_SESSION['user_id']
            ];
            
            $pdo->prepare("
                INSERT INTO email_kampanje (naziv, servis_id, subject, body, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
            ")->execute(array_values($data));
            
            sendResponse(true, ['id' => $pdo->lastInsertId()]);
        }
        break;
        
    case 'brevo-test':
        $mailer = new BrevoMailer();
        $result = $mailer->testConnection();
        sendResponse($result, $result ? 'Brevo povezan' : null, $result ? null : $mailer->getLastError());
        break;
}
