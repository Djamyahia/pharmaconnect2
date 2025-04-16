import React, { useState } from 'react';
import { UserInfoModal } from './UserInfoModal';

type UserLinkProps = {
  user: {
    company_name: string;
    email: string;
    phone: string;
    address: string;
    wilaya: string;
    delivery_wilayas?: string[];
    registration_number?: string;
  };
};

export function UserLink({ user }: UserLinkProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-indigo-600 hover:text-indigo-900 font-medium"
      >
        {user.company_name}
      </button>

      {showModal && (
        <UserInfoModal
          user={user}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}