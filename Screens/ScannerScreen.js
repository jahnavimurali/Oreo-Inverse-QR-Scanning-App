import React, { useState, useEffect } from "react";
import { Text, View, StyleSheet, Alert, ActivityIndicator } from "react-native";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import db from "./components/firebaseconfig";
import { Camera } from "expo-camera";

export default function ScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  const isValidTicket = (data) => {
    try {
      const ticketData = JSON.parse(data);

      return (
        "bookedSlot" in ticketData &&
        "bookingID" in ticketData &&
        "serviceName" in ticketData &&
        "templeID" in ticketData &&
        "noOfPersons" in ticketData &&
        "templeLocation" in ticketData &&
        "templeName" in ticketData &&
        "userEmail" in ticketData
      );
    } catch (error) {
      return false;
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setIsLoading(true);

    if (!isValidTicket(data)) {
      Alert.alert("Not a Valid Ticket", "This ticket is not valid.", [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
      setIsLoading(false);
      return;
    }

    const ticketData = JSON.parse(data);
    const {
      bookedSlot,
      bookingID,
      serviceName,
      templeID,
      noOfPersons,
      templeLocation,
      templeName,
      userEmail,
    } = ticketData;

    const dateTime = new Date(bookedSlot);
    const date = dateTime.toISOString().split("T")[0]; // yyyy-mm-dd
    const time = dateTime.toISOString().split("T")[1].slice(0, 5); // hh:mm

    const formattedDate = `${date.split("-").reverse().join("/")} at ${time}`; // dd/mm/yyyy at hh:mm

    const alertMessage = `
    Service: ${serviceName}
    Number of Persons: ${noOfPersons}
    Temple: ${templeName}
    Location: ${templeLocation}
    Date & Time: ${formattedDate}
    Booking ID: ${bookingID}
    Email: ${userEmail}
  `;

    try {
      // Fetch user document to verify the booking
      const usersRef = collection(db, "Users");
      const q = query(usersRef, where("Email", "==", userEmail));
      const querySnapshot = await getDocs(q);

      console.log(q);

      if (querySnapshot.empty) {
        Alert.alert("Not a Valid Ticket", "No such user found.", [
          { text: "OK", onPress: () => setScanned(false) },
        ]);
        setIsLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0].data();
      const bookings = [...userDoc.darshanBookings, ...userDoc.pujaBookings];
      const booking = bookings.find((b) => b.bookingID === bookingID);

      if (!booking) {
        Alert.alert("Not a Valid Ticket", "This booking ID does not exist.", [
          { text: "OK", onPress: () => setScanned(false) },
        ]);
        setIsLoading(false);
        return;
      }

      // entry/exit logic
      const templeVisitorsRef = collection(db, "TempleVisitors");
      const snapshot = await getDocs(
        query(templeVisitorsRef, where("bookingID", "==", bookingID))
      );
      const visitorDoc = snapshot.docs[0];

      if (visitorDoc) {
        // Visitor is exiting
        const visitorRef = visitorDoc.ref;
        await deleteDoc(visitorRef);

        await updateActiveVisitors(templeID, -noOfPersons);
        Alert.alert("Exit Confirmed", alertMessage, [
          { text: "OK", onPress: () => setScanned(false) },
        ]);
      } else {
        await addDoc(templeVisitorsRef, { bookingID, templeID });

        await updateActiveVisitors(templeID, noOfPersons);
        Alert.alert("Entry Confirmed", alertMessage, [
          { text: "OK", onPress: () => setScanned(false) },
        ]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error verifying ticket:", error);
      Alert.alert("Error", "An error occurred while verifying the ticket.", [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
      setIsLoading(false);
    }
  };

  const updateActiveVisitors = async (templeID, number) => {
    const templeRef = doc(db, "Temples", templeID);
    await runTransaction(db, async (transaction) => {
      const templeDoc = await transaction.get(templeRef);
      if (!templeDoc.exists()) {
        throw "Document does not exist!";
      }

      const newActiveVisitors = (templeDoc.data().activeVisitors || 0) + number;
      transaction.update(templeRef, { activeVisitors: newActiveVisitors });
    });
  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Text style={{ fontSize: 25, fontWeight: "bold", padding: 20 }}>
            Point at the QR Code
          </Text>
          <View style={styles.cameraContainer}>
            <Camera
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barCodeTypes: ["qr", "pdf417"],
              }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  cameraContainer: {
    margin: 40,
    height: 370,
    width: 370,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "black",
  },
});
