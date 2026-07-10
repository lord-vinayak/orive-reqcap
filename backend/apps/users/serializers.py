from rest_framework import serializers
from django.conf import settings
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'password', 'is_active']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password', None) or settings.DEFAULT_NEW_USER_PASSWORD
        user = User.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            role=validated_data.get('role') or User._meta.get_field('role').default,
            password=password,
            is_active=validated_data.get('is_active', True),
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField()
