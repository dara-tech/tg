// TL-Schema types (subset needed for auth + messaging)
export interface TLObject { _: string; }

export interface TLInt128 { high: bigint; low: bigint; }
export interface TLInt256 { high: bigint; midHigh: bigint; midLow: bigint; low: bigint; }

// Auth types
export interface ResPQ extends TLObject { _ : 'resPQ'; nonce: Uint8Array; server_nonce: Uint8Array; pq: Uint8Array; server_public_key_fingerprints: bigint[]; }
export interface ServerDHParamsOk extends TLObject { _: 'server_DH_params_ok'; nonce: Uint8Array; server_nonce: Uint8Array; encrypted_answer: Uint8Array; }
export interface DhGenOk extends TLObject { _: 'dh_gen_ok'; nonce: Uint8Array; server_nonce: Uint8Array; new_nonce_hash1: Uint8Array; }

// User & Auth
export interface User extends TLObject { _: 'user'; id: number; first_name?: string; last_name?: string; username?: string; phone?: string; photo?: UserProfilePhoto; status?: UserStatus; }
export interface UserProfilePhoto extends TLObject { _: 'userProfilePhoto'; photo_id: bigint; }
export interface UserStatus extends TLObject { _: string; }
export interface AuthAuthorization extends TLObject { _: 'auth.authorization'; user: User; }
export interface AuthSentCode extends TLObject { _: 'auth.sentCode'; type: SentCodeType; phone_code_hash: string; }
export interface SentCodeType extends TLObject { _: string; length?: number; }
export interface AuthSignInResult extends TLObject { _: string; }

// Dialogs
export interface DialogsResult extends TLObject { _: string; dialogs: Dialog[]; messages: Message[]; chats: Chat[]; users: User[]; count?: number; }
export interface Dialog extends TLObject { _: string; peer: Peer; top_message: number; unread_count: number; }
export interface Peer extends TLObject { _: string; user_id?: number; chat_id?: number; channel_id?: number; }

// Messages
export interface Message extends TLObject {
  _: string; id: number; peer_id: Peer; from_id?: Peer; message: string;
  date: number; out?: boolean; reply_to?: MessageReplyHeader;
  media?: MessageMedia; views?: number;
}
export interface MessageReplyHeader extends TLObject { _: string; reply_to_msg_id: number; }
export interface MessageMedia extends TLObject { _: string; }

// Chats
export interface Chat extends TLObject { _: string; id: number; title: string; photo?: ChatPhoto; participants_count?: number; }
export interface ChatPhoto extends TLObject { _: string; }

// Updates
export interface UpdatesResult extends TLObject { _ : string; updates?: Update[]; users?: User[]; chats?: Chat[]; date?: number; seq?: number; }
export interface Update extends TLObject { _: string; }
