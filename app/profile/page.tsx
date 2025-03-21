"use client";
import React, { useEffect, useState, Fragment } from "react";
import clsx from "clsx";
import { GetServerSideProps } from "next";
import "../globals.css";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { UserProvider, useUser } from "@auth0/nextjs-auth0/client";
import ProfileClient from "../components/ProfileClient";
import NavigationBar from "../components/NavigationBar";
import { isUserAdmin } from '../../actions/isUserAdmin';
import { redirect } from "next/navigation";
import { ResponsiveContainer } from "recharts";
import UserList from "app/components/UserList";


export default function Page() {
  const { user, error, isLoading } = useUser();

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        const adminStatus = await isUserAdmin();
        setIsAdmin(adminStatus);
      }
    }
    checkAdmin();
    console.log(isAdmin);
  }, [user]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <NavigationBar defaultIndex={-1} />
      <br></br>
      <br></br>

      {/* top orange box*/}
      <div className="bg-light-orange p-6 rounded-lg shadow-lg flex justify-between items-center w-1/2 mx-auto">
        
        {user ? (
          <div>
            <h1 className="text-2xl font-semibold">{user.name}</h1>
            <p className="text-sm">{user.email}</p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-semibold">General User</h1>
            <p className="text-sm">Login for User Info!</p>
          </div>
        )}
        <div>
        </div>
        <div className="flex flex-col space-y-4">
          <a
            href="/api/auth/login"
            className="bg-black text-white px-6 py-2 rounded-full shadow-lg hover:bg-orange-600 transition text-center"
          >
             Login
          </a>
          <a
            href="/api/auth/logout"
            className="bg-black text-white px-6 py-2 rounded-full shadow-lg hover:bg-orange-600 transition"
          >
            Logout
          </a>
        </div>
      </div>
      
      <br></br>  

      {isAdmin && (
        <div className="flex justify-center">
        <div className="rounded-md justify-content-center w-2/3 bg-gray-100 p-4" style={{height:400}}>
          <ResponsiveContainer>
            <UserList/>
          </ResponsiveContainer>
            {/*<div className="bg-white rounded-lg shadow-lg p-6" style={{height:370}}>
              <h3 className="font-bold text-lg mb-4">Manage Users</h3>
              <div className="flex items-center mb-4">
                <span className="h-4 w-4 bg-black rounded-full inline-block mr-4"></span>
                <p className="flex-1">Henry Ramirez</p>
                <select className="border rounded px-2 py-1">
                  <option value="Admin">Admin</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="flex items-center mb-4">
                <span className="h-4 w-4 bg-black rounded-full inline-block mr-4"></span>
                <p className="flex-1">Ben Isecke</p>
                <select className="border rounded px-2 py-1">
                  <option value="Admin">Admin</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="flex items-center mb-4">
                <span className="h-4 w-4 bg-black rounded-full inline-block mr-4"></span>
                <p className="flex-1">Vrimagha Guejesni</p>
                <select className="border rounded px-2 py-1">
                  <option value="Admin">Admin</option>
                  <option value="General">General</option>
                </select>
              </div>
              
              <br></br>
              <br></br>

              <div className="flex justify-center space-x-4">
                <a
                  href="/api/auth/login"
                  className="bg-black text-white px-6 py-2 rounded-md shadow-lg hover:bg-orange-600 transition text-center"
                >
                  Navigate to CSV Files
                </a>
                <a
                  href="/api/auth/login"
                  className="bg-black text-white px-6 py-2 rounded-md shadow-lg hover:bg-orange-600 transition text-center"
                >
                  Sync Fusion Files
                </a>
              </div>

            </div> */}
        </div>
      </div>
      )}


      <br></br>
      <br></br>
      <ProfileClient />
    </div>
  );
}
